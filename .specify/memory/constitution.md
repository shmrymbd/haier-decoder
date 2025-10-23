<!--
Sync Impact Report:
Version change: 1.0.0 → 1.1.0
Modified principles: None
Added sections: None
Removed sections: None
Templates requiring updates: ✅ updated / ⚠ pending
- .specify/templates/spec-template.md: ✅ updated (constitution check section added)
- .specify/templates/plan-template.md: ✅ updated (constitution check alignment)  
- .specify/templates/tasks-template.md: ✅ updated (constitution check alignment)
- .cursor/commands/*.md: ⚠ pending (agent-specific references need review)
Follow-up TODOs: None
-->

# Haier Protocol Decoder Constitution

## Core Principles

### I. Protocol-First Development
Every feature starts with protocol analysis and understanding; Protocol implementations must be self-contained, independently testable, and documented; Clear purpose required - no organizational-only modules; All protocol components must be traceable to captured hex data.

### II. CLI Interface
Every tool exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats; Serial communication tools must be accessible via command line; Analysis tools must provide both interactive and batch modes.

### III. Test-First (NON-NEGOTIABLE)
TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced; All protocol parsing must have corresponding test vectors; CRC validation must be tested against known good packets; Rolling code algorithms must be validated against captured sessions.

### IV. Security-First Analysis
All protocol analysis must consider security implications; Authentication mechanisms must be thoroughly documented; Rolling code analysis must follow responsible disclosure principles; No production device testing without explicit authorization; All security findings must be documented with risk assessment.

### V. Documentation-Driven Development
Every protocol component must have corresponding documentation; User stories must be independently testable; All captured data must be analyzed and documented; Protocol specifications must be complete and accurate; Implementation must match documented behavior exactly.

## Security Requirements

### Cryptographic Analysis Standards
- All rolling code analysis must use enterprise-grade security practices
- Authentication sessions must be analyzed with statistical rigor
- Pattern analysis must be documented with confidence levels
- No assumptions about algorithm complexity without evidence
- All findings must be reproducible with provided test vectors

### Responsible Disclosure
- Security vulnerabilities must be reported to Haier through proper channels
- No public disclosure of security findings without authorization
- All analysis must be for educational and research purposes only
- Production device testing requires explicit user consent
- All captured data must be anonymized where possible

### Data Protection
- Captured hex data must be stored securely
- Personal identifiers (IMEI, serial numbers) must be handled carefully
- Analysis results must not expose sensitive device information
- All logging must exclude sensitive authentication data
- Test vectors must be sanitized before sharing

## Development Workflow

### Protocol Analysis Process
1. **Data Capture**: Capture hex packets from real devices
2. **Pattern Recognition**: Identify packet structure and command types
3. **Algorithm Reverse Engineering**: Analyze authentication and CRC algorithms
4. **Implementation**: Create working protocol implementation
5. **Validation**: Test against captured data and real devices
6. **Documentation**: Document findings and implementation details

### Code Review Requirements
- All protocol parsing code must be reviewed for accuracy
- CRC implementations must be validated against known algorithms
- Security-related code must undergo security review
- Documentation must be updated with any protocol changes
- Test coverage must be maintained for all protocol components

### Quality Gates
- All protocol commands must be documented with examples
- CRC validation must achieve 100% accuracy on test vectors
- Rolling code analysis must be statistically significant
- All tools must pass integration tests with real devices
- Documentation must be complete before feature completion

## Governance

Constitution supersedes all other practices; Amendments require documentation, approval, and migration plan; All development must verify compliance with security requirements; Complexity must be justified with protocol analysis needs; Use CLAUDE.md for runtime development guidance; All protocol changes must be validated against captured data.

**Version**: 1.1.0 | **Ratified**: 2024-12-23 | **Last Amended**: 2024-12-23