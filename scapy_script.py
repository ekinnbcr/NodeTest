#!/usr/bin/env python3
# scapy_script.py

from scapy.all import IP, TCP, Raw, sr1, send
import sys
import socket
import struct
import random
from urllib.parse import urlparse

# ----- Fingerprint Overrides (capture’d values) -----
IP_TOS = 0x00  # DSCP/TOS value from capture
IP_ID = 0x8D24  # IP Identification from capture
IP_TTL = 64  # TTL value from capture
TCP_WINDOW_SIZE = 65535  # TCP window size observed
TCP_WINSCALE = 8  # Window scale value from capture
SRC_PORT = 60455  # Captured source port
DEFAULT_DPORT = 443  # Standard HTTPS port

# TLS ClientHello fingerprint constants
RANDOM_HEX = "1b979221a1697d01f00dfb890a4b1f2168b069b8ade8cb8ccc822ac4e7e9bbe1"
SESSION_ID_HEX = "b485104f57fb2dfa1644271f89f702805e05cd9a4a230cc1b9189fe8539ab43a"


def resolve_ip(hostname):
    return socket.gethostbyname(hostname)


def build_tls_client_hello(hostname):
    record_version = b"\x03\x01"
    handshake_version = b"\x03\x03"
    random_bytes = bytes.fromhex(RANDOM_HEX)
    session_id = b"\x20" + bytes.fromhex(SESSION_ID_HEX)

    suites = [
        b"\xea\xea",
        b"\x13\x01",
        b"\x13\x02",
        b"\x13\x03",
        b"\xc0\x2c",
        b"\xc0\x2b",
        b"\xcc\xa9",
        b"\xc0\x30",
        b"\xc0\x2f",
        b"\xcc\xa8",
        b"\x00\x9d",
        b"\x00\x9c",
        b"\x00\x35",
        b"\x00\x2f",
        b"\xc0\x0a",
        b"\xc0\x09",
        b"\xc0\x14",
        b"\xc0\x13",
        b"\xc0\x08",
        b"\xc0\x12",
        b"\x00\x0a",
    ]
    cipher_data = struct.pack("!H", len(suites) * 2) + b"".join(suites)
    compression = b"\x01\x00"

    ext = b""
    ext += b"\x7a\x7a\x00\x00"  # GREASE
    sn = hostname.encode()
    ext += (
        b"\x00\x00"
        + struct.pack("!H", 5 + len(sn))
        + struct.pack("!H", 3 + len(sn))
        + b"\x00"
        + struct.pack("!H", len(sn))
        + sn
    )
    ext += b"\x00\x17\x00\x00"  # extended_master_secret
    ext += b"\xff\x01\x00\x01\x00"  # renegotiation_info
    groups = [b"\xba\xba", b"\x00\x1d", b"\x00\x17", b"\x00\x18", b"\x00\x19"]
    ext += (
        b"\x00\x0a"
        + struct.pack("!H", 2 + len(b"".join(groups)))
        + struct.pack("!H", len(b"".join(groups)))
        + b"".join(groups)
    )
    ext += b"\x00\x0b\x00\x02\x01\x00"  # ec_point_formats
    alpn = b"\x02h2\x08http/1.1"
    ext += (
        b"\x00\x10"
        + struct.pack("!H", 2 + len(alpn))
        + struct.pack("!H", len(alpn))
        + alpn
    )
    ext += b"\x00\x05\x00\x05\x01\x00\x00\x00"  # status_request
    sigs = [
        b"\x04\x03",
        b"\x08\x04",
        b"\x04\x01",
        b"\x05\x03",
        b"\x02\x03",
        b"\x08\x05",
        b"\x08\x05",
        b"\x05\x01",
        b"\x08\x06",
        b"\x06\x01",
        b"\x02\x01",
    ]
    ext += (
        b"\x00\x0d"
        + struct.pack("!H", 2 + len(b"".join(sigs)))
        + struct.pack("!H", len(b"".join(sigs)))
        + b"".join(sigs)
    )
    ext += b"\x00\x12\x00\x00"  # signed_certificate_timestamp
    k1 = b"\xba\xba" + b"\x00\x01" + b"\x00"
    key = bytes.fromhex(
        "efeffbfcf1162e253585037bb921c855c0a87d6da62dd4ac01d92609ca73fe08"
    )
    ext += (
        b"\x00\x33"
        + struct.pack("!H", 2 + len(k1 + key))
        + struct.pack("!H", len(k1 + key))
        + k1
        + key
    )
    ext += b"\x00\x2d\x00\x02\x01\x01"  # psk_key_exchange_modes
    vers = [b"\x3a\x3a", b"\x03\x04", b"\x03\x03", b"\x03\x02", b"\x03\x01"]
    ext += (
        b"\x00\x2b"
        + struct.pack("!H", len(b"".join(vers)) + 1)
        + struct.pack("!B", len(vers) * 2)
        + b"".join(vers)
    )
    ext += b"\x00\x1b\x00\x03\x02\x00\x01"  # compress_certificate
    ext += b"\x5a\x5a\x00\x01\x00"  # GREASE padding
    ext += b"\x00\x15" + struct.pack("!H", 193) + b"\x00" * 193

    full_ext = struct.pack("!H", len(ext)) + ext
    length = (
        len(handshake_version)
        + len(random_bytes)
        + len(session_id)
        + len(cipher_data)
        + len(compression)
        + len(full_ext)
    )
    hello = (
        b"\x01"
        + struct.pack("!I", length)[1:]
        + handshake_version
        + random_bytes
        + session_id
        + cipher_data
        + compression
        + full_ext
    )
    return b"\x16" + record_version + struct.pack("!H", len(hello)) + hello


def perform_handshake(dst_ip, dst_port=DEFAULT_DPORT):
    # Perform TCP handshake at L3 so OS handles Ethernet
    seq = random.getrandbits(32)
    ip = IP(dst=dst_ip, ttl=IP_TTL, flags="DF", tos=IP_TOS, id=IP_ID)
    syn = TCP(
        sport=SRC_PORT,
        dport=dst_port,
        flags="S",
        seq=seq,
        window=TCP_WINDOW_SIZE,
        options=[
            ("MSS", 1460),
            ("NOP", None),
            ("WScale", TCP_WINSCALE),
            ("SAckOK", b""),
            ("Timestamp", (1, 0)),
        ],
    )
    synack = sr1(ip / syn, timeout=2, verbose=0)
    if not synack or (synack[TCP].flags & 0x12) != 0x12:
        print("SYN/ACK alınamadı.")
        sys.exit(1)

    ack = TCP(
        sport=SRC_PORT,
        dport=dst_port,
        flags="A",
        seq=seq + 1,
        ack=synack.seq + 1,
        window=TCP_WINDOW_SIZE,
        options=[("Timestamp", (2, 1))],
    )
    send(ip / ack, verbose=0)
    return seq + 1, synack.seq + 1


def send_tls_client_hello(target_url="https://pixelscan.net/"):
    parsed = urlparse(target_url)
    hostname = parsed.hostname or parsed.path
    dst_ip = resolve_ip(hostname)
    seq, ack = perform_handshake(dst_ip)
    payload = build_tls_client_hello(hostname)

    # Send TLS ClientHello at L3
    ip = IP(dst=dst_ip, ttl=IP_TTL, flags="DF", tos=IP_TOS, id=IP_ID)
    tcp = TCP(
        sport=SRC_PORT,
        dport=DEFAULT_DPORT,
        flags="PA",
        seq=seq,
        ack=ack,
        window=TCP_WINDOW_SIZE,
        options=[
            ("MSS", 1460),
            ("NOP", None),
            ("WScale", TCP_WINSCALE),
            ("NOP", None),
            ("NOP", None),
            ("Timestamp", (3, 2)),
            ("SAckOK", b""),
            ("EOL", None),
        ],
    )
    send(ip / tcp / Raw(load=payload), verbose=1)

    # Send HTTP GET to override OS fingerprint
    http = (
        b"GET /ip HTTP/1.1\r\n"
        b"Host: pixelscan.net\r\n"
        b"User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) "
        b"AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/133.0.6943.120 Mobile/15E148 Safari/604.1\r\n"
        b"\r\n"
    )
    # Build new TCP segment with updated sequence for HTTP GET
    seq_http = seq + len(payload)
    tcp_http = TCP(
        sport=SRC_PORT,
        dport=DEFAULT_DPORT,
        flags="PA",
        seq=seq_http,
        ack=ack,
        window=TCP_WINDOW_SIZE,
        options=[
            ("MSS", 1460),
            ("NOP", None),
            ("WScale", TCP_WINSCALE),
            ("NOP", None),
            ("NOP", None),
            ("Timestamp", (4, 3)),
            ("SAckOK", b""),
            ("EOL", None),
        ],
    )
    send(ip / tcp_http / Raw(load=http), verbose=1)

    # Send HTTP/2 preface and SETTINGS frame to spoof JA4 fingerprint
    # HTTP/2 connection preface
    h2_preface = b"PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n"
    # SETTINGS parameters for iOS Safari
    settings_params = (
        struct.pack("!HI", 0x1, 4096)  # HEADER_TABLE_SIZE = 4096
        + struct.pack("!HI", 0x2, 0)  # ENABLE_PUSH = 0
        + struct.pack("!HI", 0x3, 100)  # MAX_CONCURRENT_STREAMS = 100
        + struct.pack("!HI", 0x4, 65535)  # INITIAL_WINDOW_SIZE = 65535
        + struct.pack("!HI", 0x5, 16384)  # MAX_FRAME_SIZE = 16384
        + struct.pack("!HI", 0x6, 65536)  # MAX_HEADER_LIST_SIZE = 65536
    )
    # Frame header: length (24-bit), type=4, flags=0, stream=0
    settings_frame = (
        struct.pack("!I", len(settings_params))[1:]
        + b"\x04\x00\x00\x00\x00"
        + settings_params
    )
    # Build new sequence number for H2
    seq_h2 = seq_http + len(http)
    tcp_h2 = TCP(
        sport=SRC_PORT,
        dport=DEFAULT_DPORT,
        flags="PA",
        seq=seq_h2,
        ack=ack,
        window=TCP_WINDOW_SIZE,
        options=[
            ("MSS", 1460),
            ("NOP", None),
            ("WScale", TCP_WINSCALE),
            ("NOP", None),
            ("NOP", None),
            ("Timestamp", (5, 4)),
            ("SAckOK", b""),
            ("EOL", None),
        ],
    )
    # Send preface and settings in one packet
    send(ip / tcp_h2 / Raw(load=h2_preface + settings_frame), verbose=1)

    print(
        f"Spoofed TLS ClientHello and HTTP GET sent: {SRC_PORT} -> {dst_ip}:{DEFAULT_DPORT}"
    )


if __name__ == "__main__":
    send_tls_client_hello()
