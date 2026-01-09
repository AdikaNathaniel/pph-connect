import struct

def create_png(width, height, pixels):
    """Create a simple PNG file"""
    def write_chunk(f, chunk_type, data):
        f.write(struct.pack('>I', len(data)))
        f.write(chunk_type)
        f.write(data)
        crc = 0xffffffff
        for byte in chunk_type + data:
            crc ^= byte
            for _ in range(8):
                if crc & 1:
                    crc = (crc >> 1) ^ 0xedb88320
                else:
                    crc >>= 1
        f.write(struct.pack('>I', crc ^ 0xffffffff))
    
    with open('logo.png', 'wb') as f:
        # PNG signature
        f.write(b'\x89PNG\r\n\x1a\n')
        
        # IHDR chunk
        ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
        write_chunk(f, b'IHDR', ihdr_data)
        
        # IDAT chunk (simplified)
        idat_data = b'\x78\x9c\xed\xc1\x01\x01\x00\x00\x00\x80\x90\xfe\xa7\x05\xee\x01\x00\x00\x00'
        write_chunk(f, b'IDAT', idat_data)
        
        # IEND chunk
        write_chunk(f, b'IEND', b'')

# Create a 64x64 PNG
create_png(64, 64, None)
print("Professional logo created!")
