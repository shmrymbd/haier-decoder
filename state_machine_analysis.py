#!/usr/bin/env python3
"""
State machine analysis of the rolling code protocol
"""

import re
from collections import defaultdict, Counter
import sys

def extract_state_transitions(filename):
    """Extract state transitions from the protocol data"""
    
    states = []
    transitions = []
    
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
            
            # Determine state based on message type
            state = determine_state(data, device)
            
            states.append({
                'timestamp': timestamp,
                'device': device,
                'data': data,
                'state': state,
                'line': line_num
            })
    
    # Build transition matrix
    for i in range(1, len(states)):
        prev_state = states[i-1]
        curr_state = states[i]
        
        transition = {
            'from': prev_state['state'],
            'to': curr_state['state'],
            'device': curr_state['device'],
            'timestamp': curr_state['timestamp'],
            'time_diff': curr_state['timestamp'] - prev_state['timestamp'],
            'data': curr_state['data']
        }
        
        transitions.append(transition)
    
    return states, transitions

def determine_state(data, device):
    """Determine the current state based on message data"""
    
    # Power cycle states
    if data == "00":
        return "POWER_RESET"
    
    # Session initialization states
    if data.startswith("ff ff 0a 00"):
        return "SESSION_START"
    
    if data.startswith("ff ff 08 40") and "70" in data:
        return "CONTROLLER_READY"
    
    if data.startswith("ff ff 0a 40") and "01 4d 01" in data:
        return "HANDSHAKE_INIT"
    
    if data.startswith("ff ff 08 40") and "73" in data:
        return "HANDSHAKE_ACK"
    
    # Device identification states
    if data.startswith("ff ff 19 40") and "11 00 f0" in data:
        return "DEVICE_ID"
    
    if data.startswith("ff ff 2e 40") and "62" in data:
        return "FIRMWARE_INFO"
    
    if data.startswith("ff ff 2e 40") and "ec" in data:
        return "MODEL_INFO"
    
    if data.startswith("ff ff 2c 40") and "ea" in data:
        return "SERIAL_INFO"
    
    # Authentication states
    if data.startswith("ff ff 25 40") and device == "machine":
        return "AUTH_CHALLENGE"
    
    if data.startswith("ff ff 25 40") and device == "modem":
        return "AUTH_RESPONSE"
    
    # Status and control states
    if data.startswith("ff ff 43 40") and "6d 01" in data:
        return "STATUS_RESPONSE"
    
    if data.startswith("ff ff 46 40") and "6d 02" in data:
        return "DATA_RESPONSE"
    
    if data.startswith("ff ff 0a 40") and "f3" in data:
        return "STATUS_QUERY"
    
    if data.startswith("ff ff 0a 40") and "f5" in data:
        return "QUERY_ACK"
    
    # Program control states
    if data.startswith("ff ff 0e 40") and "60" in data:
        return "PROGRAM_COMMAND"
    
    if data.startswith("ff ff 0c 40") and "5d 1f" in data:
        return "RESET_COMMAND"
    
    if data.startswith("ff ff 12 40") and "0f 5a" in data:
        return "RESET_CONFIRM"
    
    # Heartbeat states
    if data.startswith("ff ff 08 40") and "4d 61" in data:
        return "HEARTBEAT_ACK"
    
    if data.startswith("ff ff 08 40") and "51 64" in data:
        return "CONTROL_SIGNAL"
    
    # Complex command states
    if data.startswith("ff ff 22 40") and "f7" in data:
        return "COMPLEX_COMMAND"
    
    if data.startswith("ff ff 20 40") and "11 10 00" in data:
        return "TIMESTAMP_SYNC"
    
    # Default state
    return "UNKNOWN"

def analyze_state_machine(states, transitions):
    """Analyze the state machine patterns"""
    print("=== STATE MACHINE ANALYSIS ===")
    
    # Count state occurrences
    state_counts = Counter([state['state'] for state in states])
    print(f"Total states: {len(states)}")
    print(f"Unique states: {len(state_counts)}")
    
    print("\nState frequency:")
    for state, count in state_counts.most_common():
        print(f"  {state}: {count}")
    
    # Analyze state transitions
    print(f"\nTotal transitions: {len(transitions)}")
    
    # Group transitions by type
    transition_counts = Counter([(t['from'], t['to']) for t in transitions])
    print(f"Unique transitions: {len(transition_counts)}")
    
    print("\nMost common transitions:")
    for (from_state, to_state), count in transition_counts.most_common(10):
        print(f"  {from_state} -> {to_state}: {count}")
    
    # Analyze state sequences
    print("\nState sequences:")
    sequences = []
    current_sequence = []
    
    for state in states:
        if state['state'] == "POWER_RESET":
            if current_sequence:
                sequences.append(current_sequence)
            current_sequence = [state['state']]
        else:
            current_sequence.append(state['state'])
    
    if current_sequence:
        sequences.append(current_sequence)
    
    print(f"Found {len(sequences)} state sequences")
    
    for i, sequence in enumerate(sequences[:5]):
        print(f"  Sequence {i+1}: {' -> '.join(sequence[:10])}{'...' if len(sequence) > 10 else ''}")

def analyze_timing_patterns(states, transitions):
    """Analyze timing patterns in state transitions"""
    print("\n=== TIMING PATTERN ANALYSIS ===")
    
    # Analyze transition timing
    transition_times = [t['time_diff'] for t in transitions if t['time_diff'] > 0]
    
    if transition_times:
        print(f"Transition timing statistics:")
        print(f"  Min: {min(transition_times)}s")
        print(f"  Max: {max(transition_times)}s")
        print(f"  Average: {sum(transition_times)/len(transition_times):.2f}s")
        
        # Group by time intervals
        intervals = {
            'immediate': [t for t in transition_times if t == 0],
            'fast': [t for t in transition_times if 0 < t <= 5],
            'medium': [t for t in transition_times if 5 < t <= 30],
            'slow': [t for t in transition_times if t > 30]
        }
        
        print("\nTransition timing distribution:")
        for interval, times in intervals.items():
            if times:
                print(f"  {interval}: {len(times)} transitions")
    
    # Analyze state duration
    state_durations = defaultdict(list)
    
    for i in range(1, len(states)):
        prev_state = states[i-1]
        curr_state = states[i]
        
        if prev_state['state'] == curr_state['state']:
            duration = curr_state['timestamp'] - prev_state['timestamp']
            state_durations[prev_state['state']].append(duration)
    
    print("\nState duration analysis:")
    for state, durations in state_durations.items():
        if durations:
            avg_duration = sum(durations) / len(durations)
            print(f"  {state}: {len(durations)} occurrences, avg {avg_duration:.2f}s")

def analyze_authentication_flow(states, transitions):
    """Analyze the authentication flow specifically"""
    print("\n=== AUTHENTICATION FLOW ANALYSIS ===")
    
    # Find authentication sequences
    auth_sequences = []
    current_auth = []
    
    for state in states:
        if state['state'] in ["AUTH_CHALLENGE", "AUTH_RESPONSE"]:
            current_auth.append(state)
        elif current_auth:
            auth_sequences.append(current_auth)
            current_auth = []
    
    if current_auth:
        auth_sequences.append(current_auth)
    
    print(f"Found {len(auth_sequences)} authentication sequences")
    
    for i, sequence in enumerate(auth_sequences):
        print(f"\nAuthentication sequence {i+1}:")
        print(f"  Duration: {sequence[-1]['timestamp'] - sequence[0]['timestamp']}s")
        print(f"  Steps: {len(sequence)}")
        
        for j, step in enumerate(sequence):
            print(f"    Step {j+1}: {step['state']} ({step['device']})")
        
        # Analyze timing between challenge and response
        challenges = [s for s in sequence if s['state'] == 'AUTH_CHALLENGE']
        responses = [s for s in sequence if s['state'] == 'AUTH_RESPONSE']
        
        if challenges and responses:
            for challenge, response in zip(challenges, responses):
                response_time = response['timestamp'] - challenge['timestamp']
                print(f"    Challenge -> Response: {response_time}s")

def analyze_power_cycle_impact(states, transitions):
    """Analyze how power cycles affect the state machine"""
    print("\n=== POWER CYCLE IMPACT ANALYSIS ===")
    
    # Find power cycles
    power_cycles = []
    current_cycle = []
    
    for state in states:
        if state['state'] == "POWER_RESET":
            if current_cycle:
                power_cycles.append(current_cycle)
            current_cycle = [state]
        else:
            current_cycle.append(state)
    
    if current_cycle:
        power_cycles.append(current_cycle)
    
    print(f"Found {len(power_cycles)} power cycles")
    
    for i, cycle in enumerate(power_cycles):
        print(f"\nPower cycle {i+1}:")
        print(f"  Duration: {cycle[-1]['timestamp'] - cycle[0]['timestamp']}s")
        print(f"  States: {len(cycle)}")
        
        # Analyze state progression
        state_progression = [state['state'] for state in cycle]
        print(f"  Progression: {' -> '.join(state_progression[:10])}{'...' if len(state_progression) > 10 else ''}")
        
        # Count unique states
        unique_states = set(state_progression)
        print(f"  Unique states: {len(unique_states)}")
        
        # Check for authentication
        has_auth = any(state['state'] in ['AUTH_CHALLENGE', 'AUTH_RESPONSE'] for state in cycle)
        print(f"  Has authentication: {has_auth}")

def main():
    filename = "rolling.txt"
    
    try:
        states, transitions = extract_state_transitions(filename)
        
        analyze_state_machine(states, transitions)
        analyze_timing_patterns(states, transitions)
        analyze_authentication_flow(states, transitions)
        analyze_power_cycle_impact(states, transitions)
        
    except FileNotFoundError:
        print(f"Error: Could not find {filename}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
