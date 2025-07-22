# Developer Documentation

This directory contains technical documentation for SWNR system development.

## Documents

### [knownIssues.md](knownIssues.md)
Tracks known issues, code structure problems, and GitHub issues. **Check this before starting any development work** to see if your changes might address related problems.

### [PowerConsumption_NamingInconsistencies.md](PowerConsumption_NamingInconsistencies.md) ⚠️ **CRITICAL ANALYSIS**
Comprehensive analysis of naming mismatches and implementation gaps in the unified power system. Identifies runtime errors from missing methods and incompatible pool key patterns.

### [PowerConsumption_ImprovementPlan.md](PowerConsumption_ImprovementPlan.md) 📋 **ACTION PLAN**
Detailed 5-phase implementation roadmap to resolve all power/consumption system issues. Includes schema fixes, migration strategy, and testing approach. **Updated with dead code cleanup requirements.**

### [PowerConsumption_DeadCodeAnalysis.md](PowerConsumption_DeadCodeAnalysis.md) 🧹 **CLEANUP ANALYSIS**  
Analysis of dead code and legacy remnants introduced during iterative development. Identifies runtime errors from incomplete implementation and provides removal strategy.

### 2.1.0_UnifiedPowers/ Directory
Contains original specifications and planning documents:
- `UnifiedPowerMagicSpecification.md` - Official v2.0 power system spec
- `UnifiedConsumptionSpecification.md` - Multi-cost consumption system spec  
- Sprint planning and test documentation

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