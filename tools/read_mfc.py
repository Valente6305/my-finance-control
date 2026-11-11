#!/usr/bin/env python3
"""
My Finance Control — .mfc reader (read-only)

Decrypts the same mfc-encrypted-v1 snapshots used by bank-accounts.html.
No file is modified and no decrypted data is written unless --export-json is used.

Requirements:
    python3 -m pip install cryptography

Usage:
    python3 read_mfc.py /path/to/my-finance-YYYY-MM-DD.mfc
    python3 read_mfc.py file.mfc --transactions
    python3 read_mfc.py file.mfc --json
    python3 read_mfc.py file.mfc --export-json snapshot.json
"""

from __future__ import annotations

import argparse
import base64
import getpass
import json
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

FORMAT_ENVELOPE = "mfc-encrypted-v1"
FORMAT_SNAPSHOT = "mfc-snapshot-v1"
ITERATIONS = 250_000


def die(message: str, code: int = 1) -> None:
    print(f"Erro: {message}", file=sys.stderr)
    raise SystemExit(code)


def load_crypto():
    try:
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        return hashes, AESGCM, PBKDF2HMAC
    except ImportError:
        die(
            "Falta o módulo 'cryptography'. Instala-o com:\n"
            "  python3 -m pip install cryptography"
        )


def b64decode(value: Any, field: str) -> bytes:
    if not isinstance(value, str) or not value:
        die(f"campo '{field}' ausente ou inválido")
    try:
        return base64.b64decode(value, validate=True)
    except Exception:
        die(f"campo '{field}' não contém Base64 válido")


def decrypt_mfc(path: Path, password: str) -> dict[str, Any]:
    hashes, AESGCM, PBKDF2HMAC = load_crypto()

    try:
        envelope = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        die(f"ficheiro não encontrado: {path}")
    except UnicodeDecodeError:
        die("o ficheiro não é um envelope .mfc textual válido")
    except json.JSONDecodeError as exc:
        die(f"JSON externo inválido: {exc}")

    if envelope.get("format") != FORMAT_ENVELOPE:
        die(f"formato não suportado: {envelope.get('format')!r}")
    if envelope.get("iterations") != ITERATIONS:
        die(
            f"iterações PBKDF2 inesperadas: {envelope.get('iterations')!r}; "
            f"esperado {ITERATIONS}"
        )

    salt = b64decode(envelope.get("salt"), "salt")
    iv = b64decode(envelope.get("iv"), "iv")
    ciphertext = b64decode(envelope.get("ciphertext"), "ciphertext")

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=ITERATIONS,
    )
    key = kdf.derive(password.encode("utf-8"))

    try:
        plain = AESGCM(key).decrypt(iv, ciphertext, None)
    except Exception:
        die("não foi possível desencriptar: palavra-passe errada ou ficheiro alterado")

    try:
        data = json.loads(plain.decode("utf-8"))
    except Exception as exc:
        die(f"conteúdo desencriptado inválido: {exc}")

    if data.get("format") != FORMAT_SNAPSHOT or not isinstance(data.get("banks"), dict):
        die("o conteúdo não é um snapshot mfc-snapshot-v1 válido")

    return data


def number(value: Any) -> Decimal | None:
    try:
        if value is None:
            return None
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def money(value: Any, currency: str = "EUR") -> str:
    n = number(value)
    if n is None:
        return "—"
    return f"{n:,.2f} {currency}".replace(",", "X").replace(".", ",").replace("X", ".")


def account_balance(account: dict[str, Any]) -> tuple[Any, str]:
    b = account.get("balance")
    if isinstance(b, dict):
        return b.get("amount"), str(b.get("currency") or "EUR")
    return None, "EUR"


def iter_accounts(data: dict[str, Any]):
    for bank_name, bank in (data.get("banks") or {}).items():
        if not isinstance(bank, dict):
            continue
        for account in bank.get("accounts") or []:
            if isinstance(account, dict):
                yield str(bank_name), account


def print_summary(data: dict[str, Any]) -> None:
    print("\n" + "=" * 72)
    print(" MY FINANCE CONTROL — CONTEÚDO DO SNAPSHOT .MFC")
    print("=" * 72)
    print(f"Formato:       {data.get('format', '—')}")
    print(f"Gerado em:     {data.get('generated_at', '—')}")

    bank_count = len(data.get("banks") or {})
    accounts = list(iter_accounts(data))
    tx_count = sum(len(a.get("transactions") or []) for _, a in accounts)

    print(f"Bancos:        {bank_count}")
    print(f"Contas:        {len(accounts)}")
    print(f"Transações:    {tx_count}")

    for bank_name, bank in (data.get("banks") or {}).items():
        print("\n" + "─" * 72)
        print(str(bank_name).upper())
        print("─" * 72)
        accounts = bank.get("accounts") if isinstance(bank, dict) else []
        if not accounts:
            print("  Sem contas no snapshot.")
            continue

        for idx, account in enumerate(accounts, 1):
            if not isinstance(account, dict):
                continue
            ref = str(account.get("account_ref") or "—")
            amount, currency = account_balance(account)
            txs = account.get("transactions") or []

            print(f"  [{idx}] Conta: {ref}")
            print(f"      Saldo:      {money(amount, currency)}")
            print(f"      Transações: {len(txs)}")

            # Show any other top-level account metadata the snapshot contains.
            extra = {
                k: v for k, v in account.items()
                if k not in {"account_ref", "balance", "transactions"}
                and v not in (None, "", [], {})
            }
            for key, value in extra.items():
                if isinstance(value, (dict, list)):
                    value = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
                print(f"      {key}: {value}")


def print_transactions(data: dict[str, Any]) -> None:
    print("\n" + "=" * 72)
    print(" TRANSAÇÕES NO SNAPSHOT")
    print("=" * 72)

    total = 0
    for bank_name, account in iter_accounts(data):
        txs = account.get("transactions") or []
        if not txs:
            continue

        ref = str(account.get("account_ref") or "—")
        print(f"\n{bank_name.upper()} · {ref}")
        print("─" * 72)

        for tx in txs:
            if not isinstance(tx, dict):
                continue
            total += 1
            date = str(tx.get("date") or tx.get("booking_date") or "—")
            desc = str(tx.get("description") or tx.get("remittance_information") or "—")
            amount = tx.get("amount")
            currency = str(tx.get("currency") or "EUR")
            if isinstance(amount, dict):
                currency = str(amount.get("currency") or currency)
                amount = amount.get("amount")
            print(f"{date:12} {money(amount, currency):>16}  {desc}")

    if total == 0:
        print("\nSem transações no snapshot.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Lê snapshots .mfc do My Finance Control sem os modificar."
    )
    parser.add_argument("file", type=Path, help="ficheiro .mfc")
    parser.add_argument(
        "--transactions", "-t", action="store_true",
        help="mostrar todas as transações após o resumo"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="mostrar também o JSON completo desencriptado"
    )
    parser.add_argument(
        "--export-json", metavar="FICHEIRO", type=Path,
        help="guardar uma cópia JSON desencriptada (contém dados financeiros sensíveis)"
    )
    args = parser.parse_args()

    password = getpass.getpass("Palavra-passe de transferência .mfc: ")
    if not password:
        die("palavra-passe vazia")

    data = decrypt_mfc(args.file.expanduser(), password)
    print_summary(data)

    if args.transactions:
        print_transactions(data)

    if args.json:
        print("\n" + "=" * 72)
        print(" JSON COMPLETO DESENCRIPTADO")
        print("=" * 72)
        print(json.dumps(data, ensure_ascii=False, indent=2))

    if args.export_json:
        out = args.export_json.expanduser()
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nJSON desencriptado guardado em: {out}")
        print("Atenção: este ficheiro JSON NÃO está encriptado.")


if __name__ == "__main__":
    main()
