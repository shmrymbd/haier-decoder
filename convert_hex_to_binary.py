#!/usr/bin/env python3
"""
Convert hex values from rolling.txt file to binary format in order.
"""

import re
import sys

def hex_to_binary(hex_string):
    """Convert a hex string to binary representation."""
    # Remove spaces and convert to binary
    hex_clean = hex_string.replace(' ', '')
    if len(hex_clean) % 2 != 0:
        hex_clean = '0' + hex_clean  # Pad with leading zero if odd length
    
    binary_result = ""
    for i in range(0, len(hex_clean), 2):
        hex_byte = hex_clean[i:i+2]
        try:
            decimal = int(hex_byte, 16)
            binary_byte = format(decimal, '08b')
            binary_result += binary_byte + " "
        except ValueError:
            print(f"Warning: Invalid hex value '{hex_byte}' found")
            continue
    
    return binary_result.strip()

def process_rolling_file(filename):
    """Process the rolling.txt file and convert all hex values to binary."""
    try:
        with open(filename, 'r') as file:
            lines = file.readlines()
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
        return
    
    print("Converting hex values to binary format...")
    print("=" * 80)
    
    line_count = 0
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        line_count += 1
        
        # Extract the hex part after the timestamp
        # Format: "modem/machine timestamp - hex_values"
        parts = line.split(' - ', 1)
        if len(parts) != 2:
            continue
            
        prefix = parts[0]
        hex_values = parts[1]
        
        # Convert hex to binary
        binary_values = hex_to_binary(hex_values)
        
        # Output format: line_number | prefix | binary_values
        print(f"Line {line_count:4d} | {prefix:<20} | {binary_values}")
        
        # Also save to file
        with open('rolling_binary_output.txt', 'a') as output_file:
            output_file.write(f"Line {line_count:4d} | {prefix:<20} | {binary_values}\n")
    
    print("=" * 80)
    print(f"Processed {line_count} lines with hex values.")
    print("Binary output also saved to 'rolling_binary_output.txt'")

def main():
    filename = "/home/admin/haier-decoder/rolling.txt"
    process_rolling_file(filename)

if __name__ == "__main__":
    main()
