#!/usr/bin/env python3
"""
Analyze rolling code patterns from the rolling.txt file
"""

import re
from collections import defaultdict
import sys

def parse_rolling_data(filename):
    """Parse the rolling.txt file and extract patterns"""
    
    # Power cycle timestamps (when both modem and machine send "00")
    power_cycles = []
    
    # Message patterns by type
    message_types = defaultdict(list)
    
    # Rolling code sequences
    rolling_codes = []
    
    with open(filename, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
                
            # Parse line format: "modem/machine timestamp - data"
            parts = line.split(' - ', 1)
            if len(parts) != 2:
                continue
                
            prefix = parts[0]
            data = parts[1]
            
            # Extract timestamp
            timestamp_match = re.search(r'(\d+)', prefix)
            if not timestamp_match:
                continue
                
            timestamp = int(timestamp_match.group(1))
            device = prefix.split()[0]  # modem or machine
            
            # Check for power cycle (both devices send "00")
            if data == "00":
                power_cycles.append((timestamp, device))
            
            # Extract message type from hex data
            if data.startswith("ff ff"):
                hex_parts = data.split()
                if len(hex_parts) >= 3:
                    msg_type = f"{hex_parts[2]} {hex_parts[3]}"  # e.g., "25 40"
                    message_types[msg_type].append((timestamp, device, data))
                    
                    # Look for rolling code patterns in specific message types
                    if msg_type in ["25 40", "43 40"]:
                        rolling_codes.append((timestamp, device, data))
    
    return power_cycles, message_types, rolling_codes

def analyze_power_cycles(power_cycles):
    """Analyze power cycle patterns"""
    print("=== POWER CYCLE ANALYSIS ===")
    
    # Group consecutive power cycles
    cycles = []
    current_cycle = []
    
    for timestamp, device in power_cycles:
        if not current_cycle:
            current_cycle = [(timestamp, device)]
        else:
            # Check if this is part of the same cycle (within 5 seconds)
            last_timestamp = current_cycle[-1][0]
            if timestamp - last_timestamp <= 5:
                current_cycle.append((timestamp, device))
            else:
                # New cycle
                if len(current_cycle) >= 2:  # Both modem and machine
                    cycles.append(current_cycle)
                current_cycle = [(timestamp, device)]
    
    # Add the last cycle
    if len(current_cycle) >= 2:
        cycles.append(current_cycle)
    
    print(f"Found {len(cycles)} power cycles:")
    for i, cycle in enumerate(cycles):
        start_time = min(ts for ts, _ in cycle)
        end_time = max(ts for ts, _ in cycle)
        duration = end_time - start_time
        print(f"  Cycle {i+1}: {start_time} - {end_time} (duration: {duration}s)")
    
    # Calculate intervals between cycles
    if len(cycles) > 1:
        print("\nIntervals between cycles:")
        for i in range(1, len(cycles)):
            prev_end = max(ts for ts, _ in cycles[i-1])
            curr_start = min(ts for ts, _ in cycles[i])
            interval = curr_start - prev_end
            print(f"  Cycle {i} to {i+1}: {interval}s")

def analyze_rolling_codes(rolling_codes):
    """Analyze rolling code patterns"""
    print("\n=== ROLLING CODE ANALYSIS ===")
    
    # Group by message type
    type_25_40 = [rc for rc in rolling_codes if "25 40" in rc[2]]
    type_43_40 = [rc for rc in rolling_codes if "43 40" in rc[2]]
    
    print(f"Type 25 40 messages: {len(type_25_40)}")
    print(f"Type 43 40 messages: {len(type_43_40)}")
    
    # Extract rolling code values (look for patterns in the hex data)
    print("\nRolling code sequences (Type 25 40):")
    for timestamp, device, data in type_25_40[:10]:  # Show first 10
        hex_parts = data.split()
        if len(hex_parts) >= 10:
            # Extract potential rolling code (bytes 8-11)
            rolling_part = " ".join(hex_parts[8:12])
            print(f"  {timestamp} {device}: {rolling_part}")
    
    print("\nRolling code sequences (Type 43 40):")
    for timestamp, device, data in type_43_40[:10]:  # Show first 10
        hex_parts = data.split()
        if len(hex_parts) >= 10:
            # Extract potential rolling code (bytes 8-11)
            rolling_part = " ".join(hex_parts[8:12])
            print(f"  {timestamp} {device}: {rolling_part}")

def analyze_message_frequency(message_types):
    """Analyze message type frequency"""
    print("\n=== MESSAGE TYPE FREQUENCY ===")
    
    for msg_type, messages in sorted(message_types.items()):
        print(f"Type {msg_type}: {len(messages)} messages")
        
        # Show timing pattern for frequent message types
        if len(messages) > 5:
            timestamps = [ts for ts, _, _ in messages]
            intervals = [timestamps[i] - timestamps[i-1] for i in range(1, len(timestamps))]
            if intervals:
                avg_interval = sum(intervals) / len(intervals)
                print(f"  Average interval: {avg_interval:.1f}s")

def main():
    filename = "rolling.txt"
    
    try:
        power_cycles, message_types, rolling_codes = parse_rolling_data(filename)
        
        analyze_power_cycles(power_cycles)
        analyze_rolling_codes(rolling_codes)
        analyze_message_frequency(message_types)
        
    except FileNotFoundError:
        print(f"Error: Could not find {filename}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
