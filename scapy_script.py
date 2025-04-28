from scapy.all import IP, TCP, Ether, srp1, sendp, conf, Raw  # type: ignore
import socket
import struct
import os
import random
from urllib.parse import urlparse

def resolve_ip(target_url):
    parsed = urlparse(target_url)
    hostname = parsed.hostname or parsed.path
    return socket.gethostbyname(hostname), hostname

def build_tls_client_hello(hostname):
    tls_version = b"\x03\x03"  # TLS 1.2 in legacy_version
    random_bytes = os.urandom(32)
    session_id = b"\x20" + os.urandom(32)

    cipher_suites = [
        b"\x13\x02", b"\x13\x03", b"\x13\x01", b"\xc0\x2b", b"\xc0\x2f", b"\xc0\x2c",
        b"\xc0\x30", b"\xcc\xa9", b"\xcc\xa8", b"\x00\x9e", b"\x00\x9f", b"\xcc\xaa",
        b"\xc0\x23", b"\xc0\x27", b"\xc0\x09", b"\xc0\x13", b"\xc0\x24", b"\xc0\x28",
        b"\xc0\x0a", b"\xc0\x14", b"\x00\x67", b"\x00\x6b", b"\x00\x9c", b"\x00\x9d",
        b"\x00\x3c", b"\x00\x3d", b"\x00\x2f", b"\x00\x35"
    ]
    cipher_data = struct.pack("!H", len(cipher_suites) * 2) + b"".join(cipher_suites)

    compression_methods = b"\x01\x00"
    extensions = b""

    # 0x00: server_name (SNI)
    sni_data = (b"\x00\x00" + struct.pack("!H", len(hostname) + 5) + b"\x00" +
                struct.pack("!H", len(hostname)) + hostname.encode())
    extensions += b"\x00\x00" + struct.pack("!H", len(sni_data)) + sni_data

    # 0x0b: ec_point_formats
    extensions += b"\x00\x0b\x00\x04\x03\x01\x02\x02"

    # 0x0a: supported_groups
    groups = [b"\x00\x1d", b"\x00\x17", b"\x00\x1e", b"\x00\x19", b"\x00\x18",
              b"\x01\x00", b"\x01\x01", b"\x01\x02", b"\x01\x03", b"\x01\x04"]
    groups_data = struct.pack("!H", len(groups) * 2) + b"".join(groups)
    extensions += (b"\x00\x0a" + struct.pack("!H", len(groups_data) + 2) +
                   struct.pack("!H", len(groups_data)) + groups_data)

    # 0x23: session_ticket
    extensions += b"\x00\x23\x00\x00"

    # 0x0d: signature_algorithms
    sigalgs = [b"\x04\x03", b"\x05\x03", b"\x06\x03", b"\x08\x07", b"\x08\x08",
               b"\x08\x04", b"\x08\x05", b"\x08\x06", b"\x04\x01", b"\x05\x01", b"\x06\x01"]
    sigalgs_data = struct.pack("!H", len(sigalgs) * 2) + b"".join(sigalgs)
    extensions += (b"\x00\x0d" + struct.pack("!H", len(sigalgs_data) + 2) +
                   struct.pack("!H", len(sigalgs_data)) + sigalgs_data)

    # 0x2b: supported_versions
    versions = [b"\x03\x04", b"\x03\x03"]
    version_data = struct.pack("!B", len(versions) * 2) + b"".join(versions)
    extensions += (b"\x00\x2b" + struct.pack("!H", len(version_data) + 1) +
                   struct.pack("!B", len(versions) * 2) + b"".join(versions))

    # 0x33: key_share
    key_exchange = os.urandom(32)
    key_share = b"\x00\x1d" + struct.pack("!H", 32) + key_exchange
    key_share_all = struct.pack("!H", len(key_share)) + key_share
    extensions += (b"\x00\x33" + struct.pack("!H", len(key_share_all) + 2) + key_share_all)

    # 0x2d: psk_key_exchange_modes
    extensions += b"\x00\x2d\x00\x02\x01\x01"

    # 0x10: ALPN
    alpn = b"\x02h2\x08http/1.1"
    extensions += (b"\x00\x10" + struct.pack("!H", len(alpn) + 2) +
                   struct.pack("!H", len(alpn)) + alpn)

    # 0x22: encrypt_then_mac
    extensions += b"\x00\x22\x00\x00"

    # 0xff01: renegotiation_info
    extensions += b"\xff\x01\x00\x01\x00"

    full_ext = struct.pack("!H", len(extensions)) + extensions

    handshake = (b"\x01" + struct.pack("!I", 4 + len(random_bytes) + len(session_id) +
                 len(cipher_data) + len(compression_methods) + len(full_ext))[1:] +
                 tls_version + random_bytes + session_id + cipher_data +
                 compression_methods + full_ext)

    return b"\x16" + tls_version + struct.pack("!H", len(handshake)) + handshake

def perform_handshake(dst_ip, dst_port=443):
    conf.route.add(host=dst_ip, gw="192.168.8.1")  # Gateway IP'yi buraya yaz

    sport = random.randint(1024, 65535)
    seq = random.randint(0, 2**32 - 1)

    ether_layer = Ether(dst="f4:a5:9d:00:d8:12")  # Gateway MAC adresi

    ip = IP(dst=dst_ip, ttl=64, flags="DF", id=random.randint(0, 65535))
    syn = TCP(
        sport=sport,
        dport=dst_port,
        flags="S",
        seq=seq,
        options=[
            ("MSS", 1460),
            ("WScale", 10),
            ("NOP", None),
            ("NOP", None),
            ("Timestamp", (12345678, 0)),
        ],
    )
    syn_packet = ether_layer / ip / syn
    synack = srp1(syn_packet, iface="Wi-Fi", timeout=10, verbose=1)

    if not synack or not (synack.haslayer(TCP) and synack.getlayer(TCP).flags & 0x12 == 0x12):
        print("SYN/ACK alınamadı.")
        return None

    ack = TCP(sport=sport, dport=dst_port, flags="A", seq=seq + 1, ack=synack.seq + 1)
    ack_packet = ether_layer / ip / ack
    sendp(ack_packet, iface="Wi-Fi", verbose=1)
    return sport, seq, synack.seq + 1

def send_tls_client_hello(target_url):
    dst_ip, hostname = resolve_ip(target_url)
    port = 443

    conf.route.add(host=dst_ip, gw="192.168.8.1")

    result = perform_handshake(dst_ip, port)
    if not result:
        return

    sport, seq, ack_seq = result
    payload = build_tls_client_hello(hostname)

    ether_layer = Ether(dst="f4:a5:9d:00:d8:12")  # Gateway MAC adresi
    ip = IP(dst=dst_ip, ttl=64, flags="DF", id=random.randint(0, 65535))
    tcp = TCP(
        sport=sport,
        dport=port,
        flags="PA",
        seq=seq + 1,
        ack=ack_seq,
        window=255,
        options=[("NOP", None), ("NOP", None), ("Timestamp", (12345680, 0))],
    )

    pkt = ether_layer / ip / tcp / Raw(load=payload)
    sendp(pkt, iface="Wi-Fi", verbose=1)

if __name__ == "__main__":
    send_tls_client_hello("https://pixelscan.net")
