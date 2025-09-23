#!/bin/bash

# Forethought Testing Agent Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Forethought Testing Agent..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $NODE_VERSION"
        exit 1
    fi
    
    print_status "Node.js version $NODE_VERSION detected ✓"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_status "npm version $NPM_VERSION detected ✓"
}

# Create necessary directories
create_directories() {
    print_header "Creating directory structure..."
    
    mkdir -p data
    mkdir -p logs
    mkdir -p policies/wiki-content
    mkdir -p conversation-templates/initial-prompts
    mkdir -p conversation-templates/scenario-templates
    mkdir -p conversation-templates/persona-profiles
    mkdir -p test-scenarios
    mkdir -p docs
    
    print_status "Directories created ✓"
}

# Set up environment file
setup_environment() {
    print_header "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_status "Environment file created from template"
        print_warning "Please edit .env file with your actual API keys and configuration"
        print_warning "Required: OPENAI_API_KEY"
        print_warning "Optional: FORETHOUGHT_API_KEY, FORETHOUGHT_WIDGET_URL, FORETHOUGHT_WORKSPACE_ID"
    else
        print_warning "Environment file already exists, skipping creation"
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing dependencies..."
    
    print_status "Installing root dependencies..."
    npm install
    
    print_status "Installing backend dependencies..."
    cd backend && npm install && cd ..
    
    # Note: Frontend will be set up in the next phase
    print_status "Dependencies installed ✓"
}

# Build backend
build_backend() {
    print_header "Building backend..."
    
    cd backend
    npm run build
    cd ..
    
    print_status "Backend built successfully ✓"
}

# Initialize database
init_database() {
    print_header "Initializing database..."
    
    # The database will be created automatically on first run
    print_status "Database will be initialized on first startup ✓"
}

# Create sample data
create_sample_data() {
    print_header "Creating sample data..."
    
    # Sample files should already be created by the artifacts
    if [ -f "conversation-templates/persona-profiles/personas.json" ]; then
        print_status "Persona profiles found ✓"
    else
        print_warning "Persona profiles not found - please add sample files"
    fi
    
    if [ -f "policies/wiki-content/billing-policies.md" ]; then
        print_status "Sample wiki content found ✓"
    else
        print_warning "Wiki content not found - please add policy files"
    fi
}

# Main setup function
main() {
    print_header "🔧 Forethought Testing Agent Setup"
    echo ""
    
    # Pre-flight checks
    check_node
    check_npm
    
    # Setup steps
    create_directories
    setup_environment
    install_dependencies
    build_backend
    init_database
    create_sample_data
    
    echo ""
    print_header "🎉 Setup Complete!"
    echo ""
    print_status "Next steps:"
    echo "  1. Edit the .env file with your OpenAI API key"
    echo "  2. Add your Forethought configuration (optional)"
    echo "  3. Start the development server:"
    echo "     ${BLUE}npm run dev${NC}"
    echo ""
    print_status "The backend will be available at: http://localhost:3001"
    print_status "API documentation: http://localhost:3001/api"
    print_status "Health check: http://localhost:3001/health"
    echo ""
    print_warning "Don't forget to:"
    echo "  • Add your support wiki content to policies/wiki-content/"
    echo "  • Customize persona profiles in conversation-templates/"
    echo "  • Review the sample test scenarios"
    echo ""
    print_status "Happy testing! 🚀"
}

# Run main function
main "$@"