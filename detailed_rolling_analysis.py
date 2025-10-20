#!/usr/bin/env python3
"""
Detailed analysis of rolling code patterns
"""

import re
from collections import defaultdict
import sys

def extract_rolling_codes(filename):
    """Extract and analyze rolling code patterns in detail"""
    
    # Power cycle analysis
    power_cycles = []
    
    # Rolling code sequences by type
    type_25_40_codes = []  # Authentication/rolling codes
    type_43_40_codes = []  # Configuration/status codes
    
    with open(filename, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
                
            parts = line.split(' - ', 1)
            if len(parts) != 2:
                continue
                
            prefix = parts[0]
            data = parts[1]
            
            # Extract timestamp and device
            timestamp_match = re.search(r'(\d+)', prefix)
            if not timestamp_match:
                continue
                
            timestamp = int(timestamp_match.group(1))
            device = prefix.split()[0]
            
            # Track power cycles
            if data == "00":
                power_cycles.append((timestamp, device))
            
            # Analyze specific message types
            if data.startswith("ff ff 25 40"):
                # Type 25 40 - Authentication/rolling code messages
                hex_parts = data.split()
                if len(hex_parts) >= 15:
                    # Extract rolling code portion (bytes 8-14)
                    rolling_code = " ".join(hex_parts[8:15])
                    type_25_40_codes.append((timestamp, device, rolling_code, data))
                    
            elif data.startswith("ff ff 43 40"):
                # Type 43 40 - Configuration messages
                hex_parts = data.split()
                if len(hex_parts) >= 15:
                    # Extract configuration portion
                    config_code = " ".join(hex_parts[8:15])
                    type_43_40_codes.append((timestamp, device, config_code, data))
    
    return power_cycles, type_25_40_codes, type_43_40_codes

def analyze_rolling_code_sequences(codes, code_type):
    """Analyze rolling code sequences for patterns"""
    print(f"\n=== {code_type} ROLLING CODE SEQUENCES ===")
    
    if not codes:
        print("No codes found")
        return
    
    print(f"Total {code_type} messages: {len(codes)}")
    
    # Group by device
    modem_codes = [c for c in codes if c[1] == 'modem']
    machine_codes = [c for c in codes if c[1] == 'machine']
    
    print(f"Modem messages: {len(modem_codes)}")
    print(f"Machine messages: {len(machine_codes)}")
    
    # Show first few codes from each device
    print(f"\nFirst 5 {code_type} codes from modem:")
    for i, (timestamp, device, code, full_data) in enumerate(modem_codes[:5]):
        print(f"  {timestamp}: {code}")
    
    print(f"\nFirst 5 {code_type} codes from machine:")
    for i, (timestamp, device, code, full_data) in enumerate(machine_codes[:5]):
        print(f"  {timestamp}: {code}")
    
    # Look for patterns in the rolling codes
    print(f"\nRolling code pattern analysis:")
    
    # Extract the actual rolling code bytes (skip the first few bytes which are likely headers)
    rolling_bytes = []
    for timestamp, device, code, full_data in codes:
        hex_parts = code.split()
        if len(hex_parts) >= 3:
            # Take the last few bytes as the actual rolling code
            rolling_part = " ".join(hex_parts[-3:])
            rolling_bytes.append((timestamp, device, rolling_part))
    
    print("Rolling code bytes (last 3 bytes):")
    for timestamp, device, rolling_part in rolling_bytes[:10]:
        print(f"  {timestamp} {device}: {rolling_part}")
    
    # Check for incrementing patterns
    if len(rolling_bytes) > 1:
        print("\nChecking for incrementing patterns...")
        for i in range(1, min(10, len(rolling_bytes))):
            prev = rolling_bytes[i-1][2]
            curr = rolling_bytes[i][2]
            print(f"  {rolling_bytes[i-1][0]} -> {rolling_bytes[i][0]}: {prev} -> {curr}")

def analyze_power_cycle_impact(power_cycles, type_25_40_codes, type_43_40_codes):
    """Analyze how power cycles affect rolling codes"""
    print("\n=== POWER CYCLE IMPACT ANALYSIS ===")
    
    # Group power cycles
    cycle_groups = []
    current_group = []
    
    for timestamp, device in power_cycles:
        if not current_group:
            current_group = [(timestamp, device)]
        else:
            last_timestamp = current_group[-1][0]
            if timestamp - last_timestamp <= 5:
                current_group.append((timestamp, device))
            else:
                if len(current_group) >= 2:
                    cycle_groups.append(current_group)
                current_group = [(timestamp, device)]
    
    if len(current_group) >= 2:
        cycle_groups.append(current_group)
    
    print(f"Found {len(cycle_groups)} power cycles")
    
    # Analyze rolling codes around power cycles
    for i, cycle in enumerate(cycle_groups):
        cycle_start = min(ts for ts, _ in cycle)
        cycle_end = max(ts for ts, _ in cycle)
        
        print(f"\nPower Cycle {i+1}: {cycle_start} - {cycle_end}")
        
        # Find rolling codes before and after this cycle
        before_codes = [c for c in type_25_40_codes if c[0] < cycle_start]
        after_codes = [c for c in type_25_40_codes if c[0] > cycle_end]
        
        print(f"  Rolling codes before: {len(before_codes)}")
        print(f"  Rolling codes after: {len(after_codes)}")
        
        if before_codes and after_codes:
            last_before = before_codes[-1][2]
            first_after = after_codes[0][2]
            print(f"  Last before cycle: {last_before}")
            print(f"  First after cycle: {first_after}")

def main():
    filename = "rolling.txt"
    
    try:
        power_cycles, type_25_40_codes, type_43_40_codes = extract_rolling_codes(filename)
        
        analyze_rolling_code_sequences(type_25_40_codes, "25 40")
        analyze_rolling_code_sequences(type_43_40_codes, "43 40")
        analyze_power_cycle_impact(power_cycles, type_25_40_codes, type_43_40_codes)
        
    except FileNotFoundError:
        print(f"Error: Could not find {filename}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
