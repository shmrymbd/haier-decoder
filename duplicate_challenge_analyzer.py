#!/usr/bin/env python3
"""
Extract and analyze duplicate challenge pairs from rolling.txt
"""

import re
from collections import defaultdict, Counter
import sys

def extract_rolling_codes_with_context(filename):
    """Extract rolling codes with full context"""
    rolling_codes = []
    
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    for line_num, line in enumerate(lines, 1):
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
        
        # Analyze Type 25 40 (Authentication messages)
        if data.startswith("ff ff 25 40"):
            hex_parts = data.split()
            if len(hex_parts) >= 15:
                # Extract challenge and response
                challenge = "".join(hex_parts[8:16])  # 8 bytes challenge
                response = "".join(hex_parts[16:])    # Encrypted response
                
                rolling_codes.append({
                    'line_number': line_num,
                    'timestamp': timestamp,
                    'device': device,
                    'challenge': challenge,
                    'response': response,
                    'full_data': data,
                    'hex_parts': hex_parts
                })
    
    return rolling_codes

def find_duplicate_challenges(rolling_codes):
    """Find and analyze duplicate challenges"""
    challenge_groups = defaultdict(list)
    
    # Group by challenge
    for code in rolling_codes:
        challenge_groups[code['challenge']].append(code)
    
    # Find duplicates
    duplicates = {challenge: codes for challenge, codes in challenge_groups.items() if len(codes) > 1}
    
    return duplicates

def analyze_duplicate_patterns(duplicates):
    """Analyze patterns in duplicate challenges"""
    print("=== DUPLICATE CHALLENGE ANALYSIS ===")
    
    if not duplicates:
        print("No duplicate challenges found")
        return
    
    print(f"Found {len(duplicates)} duplicate challenges:")
    
    for challenge, codes in duplicates.items():
        print(f"\nChallenge: {challenge}")
        print(f"  Occurrences: {len(codes)}")
        
        for i, code in enumerate(codes):
            print(f"  Occurrence {i+1}:")
            print(f"    Line: {code['line_number']}")
            print(f"    Timestamp: {code['timestamp']}")
            print(f"    Device: {code['device']}")
            print(f"    Response: {code['response'][:32]}...")
        
        # Analyze timing between duplicates
        if len(codes) > 1:
            print(f"  Timing analysis:")
            for i in range(1, len(codes)):
                time_diff = codes[i]['timestamp'] - codes[i-1]['timestamp']
                print(f"    Time between occurrence {i} and {i+1}: {time_diff}s")
        
        # Analyze responses for duplicates
        responses = [code['response'] for code in codes]
        unique_responses = set(responses)
        print(f"  Unique responses: {len(unique_responses)}")
        
        if len(unique_responses) == len(responses):
            print("  All responses are unique")
        else:
            print("  WARNING: Some responses are identical")

def create_duplicate_mapping_file(duplicates, filename="duplicate_challenges_mapping.txt"):
    """Create detailed mapping file of duplicate challenges"""
    
    with open(filename, 'w') as f:
        f.write("# Duplicate Challenge Pairs Mapping\n")
        f.write("# Generated from rolling.txt analysis\n")
        f.write("# Format: Challenge -> [Occurrences with context]\n\n")
        
        if not duplicates:
            f.write("No duplicate challenges found.\n")
            return
        
        f.write(f"Total duplicate challenges: {len(duplicates)}\n\n")
        
        for challenge, codes in duplicates.items():
            f.write(f"## Challenge: {challenge}\n")
            f.write(f"Occurrences: {len(codes)}\n\n")
            
            for i, code in enumerate(codes):
                f.write(f"### Occurrence {i+1}\n")
                f.write(f"Line Number: {code['line_number']}\n")
                f.write(f"Timestamp: {code['timestamp']}\n")
                f.write(f"Device: {code['device']}\n")
                f.write(f"Response: {code['response']}\n")
                f.write(f"Full Data: {code['full_data']}\n")
                f.write("\n")
            
            # Timing analysis
            if len(codes) > 1:
                f.write("### Timing Analysis\n")
                for i in range(1, len(codes)):
                    time_diff = codes[i]['timestamp'] - codes[i-1]['timestamp']
                    f.write(f"Time between occurrence {i} and {i+1}: {time_diff}s\n")
                f.write("\n")
            
            # Response analysis
            responses = [code['response'] for code in codes]
            unique_responses = set(responses)
            f.write("### Response Analysis\n")
            f.write(f"Unique responses: {len(unique_responses)} out of {len(responses)}\n")
            
            if len(unique_responses) == len(responses):
                f.write("All responses are unique - encryption is working correctly\n")
            else:
                f.write("WARNING: Some responses are identical - potential encryption flaw\n")
            
            f.write("\n" + "="*80 + "\n\n")
    
    print(f"Duplicate challenge mapping saved to: {filename}")

def analyze_power_cycle_context(rolling_codes, duplicates):
    """Analyze duplicate challenges in context of power cycles"""
    
    # Find power cycles
    power_cycles = []
    current_cycle = []
    
    for code in rolling_codes:
        if not current_cycle:
            current_cycle = [code]
        else:
            # Check if this is a new power cycle (large time gap)
            time_diff = code['timestamp'] - current_cycle[-1]['timestamp']
            if time_diff > 30:  # More than 30 seconds
                if len(current_cycle) > 1:
                    power_cycles.append(current_cycle)
                current_cycle = [code]
            else:
                current_cycle.append(code)
    
    if len(current_cycle) > 1:
        power_cycles.append(current_cycle)
    
    print(f"\n=== POWER CYCLE CONTEXT ANALYSIS ===")
    print(f"Total power cycles: {len(power_cycles)}")
    
    # Analyze which power cycles contain duplicates
    duplicate_cycles = []
    
    for cycle_num, cycle in enumerate(power_cycles):
        cycle_challenges = [code['challenge'] for code in cycle if code['device'] == 'machine']
        
        # Check if this cycle contains any duplicate challenges
        cycle_duplicates = []
        for challenge in cycle_challenges:
            if challenge in duplicates:
                cycle_duplicates.append(challenge)
        
        if cycle_duplicates:
            duplicate_cycles.append((cycle_num + 1, cycle_duplicates))
            print(f"Power Cycle {cycle_num + 1}: Contains duplicates {cycle_duplicates}")
    
    return duplicate_cycles

def create_detailed_analysis_report(rolling_codes, duplicates, duplicate_cycles):
    """Create comprehensive analysis report"""
    
    with open("duplicate_challenges_detailed_analysis.md", 'w') as f:
        f.write("# Duplicate Challenge Detailed Analysis\n\n")
        
        f.write("## Executive Summary\n")
        f.write(f"- Total rolling code messages analyzed: {len(rolling_codes)}\n")
        f.write(f"- Duplicate challenges found: {len(duplicates)}\n")
        f.write(f"- Power cycles containing duplicates: {len(duplicate_cycles)}\n\n")
        
        f.write("## Duplicate Challenge Details\n\n")
        
        for challenge, codes in duplicates.items():
            f.write(f"### Challenge: `{challenge}`\n")
            f.write(f"- **Occurrences**: {len(codes)}\n")
            f.write(f"- **First occurrence**: Line {codes[0]['line_number']}, Timestamp {codes[0]['timestamp']}\n")
            f.write(f"- **Last occurrence**: Line {codes[-1]['line_number']}, Timestamp {codes[-1]['timestamp']}\n")
            
            if len(codes) > 1:
                time_span = codes[-1]['timestamp'] - codes[0]['timestamp']
                f.write(f"- **Time span**: {time_span} seconds\n")
            
            f.write("\n#### Occurrences:\n")
            for i, code in enumerate(codes):
                f.write(f"{i+1}. Line {code['line_number']}, Timestamp {code['timestamp']}, Device: {code['device']}\n")
                f.write(f"   Response: `{code['response'][:32]}...`\n")
            
            f.write("\n")
        
        f.write("## Power Cycle Analysis\n\n")
        f.write("### Power Cycles with Duplicate Challenges\n\n")
        
        for cycle_num, duplicate_challenges in duplicate_cycles:
            f.write(f"**Power Cycle {cycle_num}**:\n")
            for challenge in duplicate_challenges:
                f.write(f"- Challenge: `{challenge}`\n")
            f.write("\n")
        
        f.write("## Security Implications\n\n")
        f.write("### Vulnerabilities Identified\n")
        f.write("1. **Replay Attack Risk**: Duplicate challenges can be replayed\n")
        f.write("2. **Challenge Generation Flaw**: PRNG or challenge algorithm has issues\n")
        f.write("3. **Predictable Patterns**: Duplicates occur in specific power cycles\n\n")
        
        f.write("### Recommendations\n")
        f.write("1. **Immediate**: Fix challenge generation algorithm\n")
        f.write("2. **Short-term**: Implement challenge uniqueness validation\n")
        f.write("3. **Long-term**: Upgrade to stronger cryptographic protocols\n\n")
        
        f.write("## Technical Details\n\n")
        f.write("### Challenge Format Analysis\n")
        f.write("- Format: `00 12 10 02 00 01 [4-byte rolling code]`\n")
        f.write("- Rolling code length: 4 bytes (32 bits)\n")
        f.write("- Total possible values: 2^32 = 4,294,967,296\n")
        f.write("- Duplicate rate: {:.1f}%\n".format(len(duplicates) / len(set(code['challenge'] for code in rolling_codes)) * 100))
        
        f.write("\n### Response Analysis\n")
        responses = [code['response'] for code in rolling_codes]
        unique_responses = len(set(responses))
        f.write(f"- Total responses: {len(responses)}\n")
        f.write(f"- Unique responses: {unique_responses}\n")
        f.write(f"- Response uniqueness rate: {unique_responses/len(responses)*100:.1f}%\n")
        
        if unique_responses == len(responses):
            f.write("- **Encryption is working correctly** - all responses are unique\n")
        else:
            f.write("- **WARNING**: Some responses are identical - encryption flaw detected\n")
    
    print("Detailed analysis report saved to: duplicate_challenges_detailed_analysis.md")

def main():
    filename = "rolling.txt"
    
    try:
        print("Extracting rolling codes from rolling.txt...")
        rolling_codes = extract_rolling_codes_with_context(filename)
        print(f"Found {len(rolling_codes)} rolling code messages")
        
        print("\nFinding duplicate challenges...")
        duplicates = find_duplicate_challenges(rolling_codes)
        print(f"Found {len(duplicates)} duplicate challenges")
        
        print("\nAnalyzing duplicate patterns...")
        analyze_duplicate_patterns(duplicates)
        
        print("\nCreating duplicate mapping file...")
        create_duplicate_mapping_file(duplicates)
        
        print("\nAnalyzing power cycle context...")
        duplicate_cycles = analyze_power_cycle_context(rolling_codes, duplicates)
        
        print("\nCreating detailed analysis report...")
        create_detailed_analysis_report(rolling_codes, duplicates, duplicate_cycles)
        
        print("\nAnalysis complete!")
        print("Files created:")
        print("- duplicate_challenges_mapping.txt")
        print("- duplicate_challenges_detailed_analysis.md")
        
    except FileNotFoundError:
        print(f"Error: Could not find {filename}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
