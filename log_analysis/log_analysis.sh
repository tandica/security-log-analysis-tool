#!/bin/bash

# A basic tool to analyze security logs for authentication events related to login and password changes.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
REPORT_DIR="$SCRIPT_DIR/reports"
SRC_DIR="$SCRIPT_DIR/"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="$REPORT_DIR/security_report_$TIMESTAMP.txt"

mkdir -p "$LOG_DIR"
mkdir -p "$REPORT_DIR"

echo "==============================================="
echo "   Welcome to the Security Log Analysis Tool!  "
echo "==============================================="
echo

# Check if Node.js is installed
check_requirements() {
    echo "------Starting script------"
    echo
    echo "Checking system requirements..."
    
    if ! command -v node &> /dev/null; then
        echo "Error: Node.js is not installed. Please install Node.js to use this tool."
        exit 1
    fi
      
    echo "System requirements satisfied."
    echo
}

collect_logs() {
    echo "Collecting log files for analysis..."
    
    # Check if there is appropriate permissions to read logs
    if [ -f "/var/log/secure" ] && [ -r "/var/log/secure" ]; then
        cp /var/log/secure "$LOG_DIR/secure.log"
        echo "- Copied /var/log/secure"
    elif [ -f "/var/log/secure" ]; then
        echo "- Cannot read /var/log/secure. Run the script with sudo or with the root user."
    fi
    
    # If user specified log files from the cmd line, copy them into the logs directory
    if [ "$#" -gt 0 ]; then
        for log_file in "$@"; do
            if [ -f "$log_file" ] && [ -r "$log_file" ]; then
                cp "$log_file" "$LOG_DIR/$(basename "$log_file")"
                echo "- Copied $log_file"
            else
                echo "- Could not copy $log_file (file not found or not readable)"
            fi
        done
    fi
    
    if [ -z "$(ls -A "$LOG_DIR")" ]; then
        echo "Error: No logs were collected."
        exit 1
    fi
    
    echo "Log collection complete."
    echo
}


analyze_logs() {
    echo "Analyzing logs for security events..."

    node "$SRC_DIR/parser.js" "$LOG_DIR" "$REPORT_FILE"
    
    echo "Analysis complete."
    echo
    echo "------Ending script------"
    echo
}


display_report() {
    echo "Security Analysis Report:"
    echo "========================="
    echo
    
    if [ -f "$REPORT_FILE" ]; then
        cat "$REPORT_FILE"
        echo
        echo "Full report saved to: $REPORT_FILE"
    else
        echo "Error: Report file was not generated."
    fi
}

check_requirements
collect_logs "$@"
analyze_logs
display_report

echo
echo "Security log analysis completed successfully."
echo "Thank you for using the Security Log Analysis Tool."
