# Implementation Plan Template & Validation

This directory contains implementation plans for the Discord bot project, following a standardized AI-optimized template structure designed for machine-readable, deterministic execution.

## Overview

Implementation plans are structured documents that outline feature development, refactoring tasks, architecture changes, and other significant project work. They follow a strict template to ensure:

- **Machine-readable format** for AI agents and automated processing
- **Deterministic structure** with zero ambiguity
- **Complete self-containment** with no external dependencies
- **Standardized identifiers** for automated parsing and tracking

## Template Structure

All implementation plans must follow this exact structure:

### Front Matter (Required)
```yaml
---
goal: "Concise title describing the plan's goal"
version: "1.0"
date_created: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
owner: "Team/Individual responsible"
tags: ["feature", "upgrade", "chore", "architecture", "migration", "bug"]
---
```

### Required Sections
1. **Introduction** - Brief overview of the plan and its goal
2. **Requirements & Constraints** - Explicit requirements, security constraints, guidelines, and patterns
3. **Implementation Steps** - Phased approach with task tables
4. **Alternatives** - Considered approaches and rationale for rejection
5. **Dependencies** - Libraries, frameworks, or components required
6. **Files** - Files that will be affected by the implementation
7. **Testing** - Tests needed to verify the implementation
8. **Risks & Assumptions** - Potential risks and underlying assumptions
9. **Related Specifications** - Links to relevant documentation

## Identifier Standards

All items in the plan must use standardized prefixes:

- **REQ-001**: Requirements
- **SEC-001**: Security requirements
- **CON-001**: Constraints
- **GUD-001**: Guidelines
- **PAT-001**: Patterns to follow
- **TASK-001**: Implementation tasks
- **GOAL-001**: Phase goals
- **ALT-001**: Alternative approaches
- **DEP-001**: Dependencies
- **FILE-001**: Affected files
- **TEST-001**: Test cases
- **RISK-001**: Risks
- **ASSUMPTION-001**: Assumptions

## Task Table Format

Implementation steps must use this table format:

```markdown
| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Description of task 1 | ✅ | 2025-01-28 |
| TASK-002 | Description of task 2 | | |
```

## File Naming Convention

Plans follow this naming pattern:
```
[purpose]-[component]-[version].md
```

**Purpose prefixes:**
- `upgrade` - Package or system upgrades
- `refactor` - Code refactoring
- `feature` - New feature development
- `data` - Data migrations or changes
- `infrastructure` - Infrastructure changes
- `process` - Process improvements
- `architecture` - Architectural changes
- `design` - Design system changes

**Examples:**
- `feature-enhanced-message-analysis-1.md`
- `upgrade-system-command-4.md`
- `refactor-legacy-service-cleanup-1.md`

## Validation

### Running the Validator

The validator ensures all plans comply with the template structure:

```bash
# Validate a specific plan
node validate-plan-template.js plan-name.md

# Validate all plans
node validate-plan-template.js --validate-all
```

### Validation Checks

The validator performs these checks:

1. **Front Matter** - All required fields present and properly formatted
2. **Sections** - All required sections present with correct headers
3. **Identifiers** - All mandatory identifier prefixes present (REQ-, TASK-, GOAL-)
4. **Task Tables** - Proper table format with required columns
5. **No Placeholders** - No TODO, FIXME, or placeholder text

### Current Validation Status

- **Valid Files**: 4/10 (40% compliance)
- **Invalid Files**: 6/10 (need template updates)

## Creating New Plans

### Step 1: Choose Template Type
Select the appropriate template based on your purpose:
- Feature development
- Refactoring
- Architecture changes
- Infrastructure updates

### Step 2: Follow Template Structure
1. Create front matter with all required fields
2. Write introduction explaining the goal
3. Define requirements and constraints
4. Break implementation into phases with task tables
5. Document alternatives considered
6. List dependencies and affected files
7. Define testing requirements
8. Identify risks and assumptions
9. Link to related documentation

### Step 3: Use Standardized Identifiers
- Number all items sequentially (REQ-001, REQ-002, etc.)
- Use consistent formatting (bold for requirements, plain for tasks)
- Ensure all mandatory prefixes are present

### Step 4: Validate
Run the validator to ensure compliance:
```bash
node validate-plan-template.js your-plan-name.md
```

## Best Practices

### Content Guidelines
- **Be specific** - Include exact file paths, function names, and implementation details
- **Use deterministic language** - Avoid ambiguous terms that require interpretation
- **Include measurable criteria** - Define clear completion criteria for each task
- **Consider dependencies** - Document cross-phase dependencies explicitly
- **Plan for testing** - Include comprehensive test coverage requirements

### Technical Guidelines
- **Follow naming conventions** - Use consistent file and identifier naming
- **Maintain structure** - Keep all required sections and formatting
- **Update regularly** - Keep plans current as implementation progresses
- **Version control** - Track changes and maintain history
- **Cross-reference** - Link related plans and documentation

### Quality Assurance
- **Validate before committing** - Always run validation before submitting plans
- **Review for completeness** - Ensure all sections are properly populated
- **Check for consistency** - Verify identifier numbering and formatting
- **Test assumptions** - Validate technical assumptions and dependencies

## Migration Guide

For existing plans that don't follow the new template:

1. **Add front matter** with required fields
2. **Restructure content** into required sections
3. **Add standardized identifiers** to all items
4. **Create task tables** for implementation steps
5. **Add missing sections** (Alternatives, Dependencies, etc.)
6. **Validate** using the validator tool

## Troubleshooting

### Common Validation Errors

**Missing Front Matter**
- Add YAML front matter with all required fields
- Ensure proper formatting with `---` delimiters

**Missing Sections**
- Add all required section headers
- Use exact header text (case-sensitive)

**Missing Identifiers**
- Add standardized prefixes to all items
- Ensure mandatory prefixes (REQ-, TASK-, GOAL-) are present

**Invalid Task Tables**
- Use proper markdown table format
- Include all required columns (Task, Description, Completed, Date)

**Placeholder Content**
- Remove TODO, FIXME, and placeholder text
- Replace with specific, actionable content

### Getting Help

- Check existing valid plans for examples
- Review this documentation for guidelines
- Run validation with `--validate-all` to see all issues
- Consult the template structure above

## Future Improvements

Planned enhancements to the validation system:

- **Automated plan generation** from templates
- **Progress tracking** integration
- **Dependency analysis** between plans
- **Timeline visualization** for complex implementations
- **Integration** with project management tools

---

For questions or issues with implementation plans, refer to this documentation or run the validator for specific guidance. 