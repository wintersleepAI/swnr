# Developer Documentation

This directory contains technical documentation for SWNR system development.

## Documents

### [knownIssues.md](knownIssues.md)
Tracks known issues, code structure problems, and GitHub issues. **Check this before starting any development work** to see if your changes might address related problems.

### [UnifiedPowerMagicSpecification.md](UnifiedPowerMagicSpecification.md)
Official specification for the v2.0 Unified Power & Magic system. Defines the schema and behavior for consolidating psychic powers, spells, arts, and other magical abilities into a single `power` item type.

### [Sprint1-Planning.md](Sprint1-Planning.md)
Detailed implementation plan for Sprint S-1 of the Unified Power system, including:
- Task breakdown and dependencies
- Migration strategy and risk mitigation
- Testing framework setup
- Success criteria and performance benchmarks

## Development Workflow

1. **Before starting work**: Check `knownIssues.md` for related problems
2. **For major features**: Review relevant specification documents
3. **During implementation**: Consider addressing nearby known issues if the work overlaps
4. **After completion**: Update documentation to remove resolved issues

## File Organization

```
docs/dev/
├── README.md                           # This file
├── knownIssues.md                      # Known problems tracker
├── UnifiedPowerMagicSpecification.md   # v2.0 power system spec
└── Sprint1-Planning.md                 # S-1 implementation plan
```

## Contributing to Documentation

When adding new development docs:
- Keep technical analysis separate from specifications
- Update `knownIssues.md` when discovering new problems
- Cross-reference related documents
- Include code examples for complex implementations
- Consider maintenance burden of proposed changes