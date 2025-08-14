#!/bin/bash

# Cursor Rules Recovery and Management Script
# This script helps recover and manage Cursor rules for the Chatterbot project

echo "🔧 Cursor Rules Recovery and Management"
echo "======================================"

# Function to check if .cursorrules exists
check_cursorrules() {
    if [ -f ".cursorrules" ]; then
        echo "✅ .cursorrules file found"
        return 0
    else
        echo "❌ .cursorrules file not found"
        return 1
    fi
}

# Function to check if .cursor directory exists
check_cursor_dir() {
    if [ -d ".cursor" ]; then
        echo "✅ .cursor directory found"
        return 0
    else
        echo "❌ .cursor directory not found"
        return 1
    fi
}

# Function to backup current rules
backup_rules() {
    echo "📦 Creating backup of current Cursor rules..."
    
    if check_cursorrules; then
        cp .cursorrules .cursorrules.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ .cursorrules backed up"
    fi
    
    if check_cursor_dir; then
        tar -czf .cursor.backup.$(date +%Y%m%d_%H%M%S).tar.gz .cursor/
        echo "✅ .cursor directory backed up"
    fi
}

# Function to restore from backup
restore_from_backup() {
    echo "🔄 Looking for backup files..."
    
    # Find .cursorrules backups
    cursorrules_backups=$(ls -t .cursorrules.backup.* 2>/dev/null | head -1)
    if [ -n "$cursorrules_backups" ]; then
        echo "📥 Found .cursorrules backup: $cursorrules_backups"
        read -p "Restore .cursorrules from backup? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$cursorrules_backups" .cursorrules
            echo "✅ .cursorrules restored from backup"
        fi
    fi
    
    # Find .cursor directory backups
    cursor_backups=$(ls -t .cursor.backup.*.tar.gz 2>/dev/null | head -1)
    if [ -n "$cursor_backups" ]; then
        echo "📥 Found .cursor directory backup: $cursor_backups"
        read -p "Restore .cursor directory from backup? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            tar -xzf "$cursor_backups"
            echo "✅ .cursor directory restored from backup"
        fi
    fi
}

# Function to check git history for rules
check_git_history() {
    echo "🔍 Checking git history for Cursor rules..."
    
    # Check for .cursorrules in git history
    if git log --all --full-history -- .cursorrules | grep -q .; then
        echo "✅ Found .cursorrules in git history"
        git log --oneline --all --full-history -- .cursorrules
    else
        echo "❌ No .cursorrules found in git history"
    fi
    
    # Check for .cursor directory in git history
    if git log --all --full-history -- .cursor/ | grep -q .; then
        echo "✅ Found .cursor directory in git history"
        git log --oneline --all --full-history -- .cursor/
    else
        echo "❌ No .cursor directory found in git history"
    fi
}

# Function to create new rules
create_new_rules() {
    echo "🆕 Creating new Cursor rules..."
    
    if [ ! -f ".cursorrules" ]; then
        echo "Creating .cursorrules file..."
        cat > .cursorrules << 'EOF'
# Chatterbot Cursor Rules
# Advanced Discord AI bot powered by Google Gemini

## Project Overview
This is a sophisticated Discord AI bot with service-oriented architecture, comprehensive testing, and security-first approach.

## Key Guidelines
- Use TypeScript with strict mode
- Follow service-oriented architecture with dependency injection
- Implement comprehensive error handling
- Maintain 100% test coverage
- Prioritize security in all implementations
- Use proper documentation and JSDoc
- Follow conventional commit messages
- Implement proper logging and monitoring

## Architecture Patterns
- Service interfaces and dependency injection
- Structured error handling with AppError classes
- Circuit breaker patterns for API protection
- Comprehensive testing with Jest
- Security-first approach with audit logging

## Development Standards
- Use ES2022 modules with .js extensions
- Implement proper type guards and validation
- Use interfaces over types for object shapes
- Maintain clean code and documentation
- Follow established patterns and conventions
EOF
        echo "✅ .cursorrules created"
    fi
    
    if [ ! -d ".cursor" ]; then
        echo "Creating .cursor directory..."
        mkdir -p .cursor
        cat > .cursor/settings.json << 'EOF'
{
  "projectName": "chatterbot",
  "description": "Advanced Discord AI bot powered by Google Gemini",
  "rules": {
    "typescript": {
      "strict": true,
      "preferInterfaces": true,
      "noAny": true
    },
    "architecture": {
      "serviceOriented": true,
      "dependencyInjection": true,
      "errorHandling": "structured"
    },
    "security": {
      "first": true,
      "auditLogging": true,
      "inputValidation": true
    }
  }
}
EOF
        echo "✅ .cursor/settings.json created"
    fi
}

# Function to show current status
show_status() {
    echo "📊 Current Cursor Rules Status:"
    echo "================================"
    
    check_cursorrules
    check_cursor_dir
    
    echo ""
    echo "📁 Project structure:"
    ls -la .cursor* 2>/dev/null || echo "No Cursor files found"
    
    echo ""
    echo "📋 Available backups:"
    ls -la .cursor*.backup.* .cursor.backup.*.tar.gz 2>/dev/null || echo "No backups found"
}

# Main menu
show_menu() {
    echo ""
    echo "🛠️  Cursor Rules Management Menu:"
    echo "1. Show current status"
    echo "2. Create backup of current rules"
    echo "3. Restore from backup"
    echo "4. Check git history for rules"
    echo "5. Create new rules (if missing)"
    echo "6. Exit"
    echo ""
}

# Main execution
main() {
    case "${1:-}" in
        "status")
            show_status
            ;;
        "backup")
            backup_rules
            ;;
        "restore")
            restore_from_backup
            ;;
        "history")
            check_git_history
            ;;
        "create")
            create_new_rules
            ;;
        "menu"|"")
            while true; do
                show_menu
                read -p "Select an option (1-6): " -n 1 -r
                echo
                case $REPLY in
                    1) show_status ;;
                    2) backup_rules ;;
                    3) restore_from_backup ;;
                    4) check_git_history ;;
                    5) create_new_rules ;;
                    6) echo "👋 Goodbye!"; exit 0 ;;
                    *) echo "❌ Invalid option. Please try again." ;;
                esac
                echo ""
                read -p "Press Enter to continue..."
            done
            ;;
        *)
            echo "Usage: $0 [status|backup|restore|history|create|menu]"
            echo ""
            echo "Commands:"
            echo "  status  - Show current Cursor rules status"
            echo "  backup  - Create backup of current rules"
            echo "  restore - Restore rules from backup"
            echo "  history - Check git history for rules"
            echo "  create  - Create new rules if missing"
            echo "  menu    - Interactive menu (default)"
            ;;
    esac
}

# Run main function
main "$@"
