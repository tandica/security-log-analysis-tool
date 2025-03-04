#!/usr/bin/env node

// Parses log files and gets security events like failed login,
// successful login and password changes

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Check command line arguments
if (process.argv.length < 4) {
  console.error("Usage: node analyzer.js <log_directory> <report_file>");
  process.exit(1);
}

const logDirectory = process.argv[2];
const reportFile = process.argv[3];

// Patterns to match log formats
const patterns = {
  failedLogin: [
    /Failed password for (invalid user )?(\S+) from (\S+)/i,
    /authentication failure.*user=(\S+)/i,
    /Failed login attempt for user '(\S+)'/i,
  ],
  successfulLogin: [
    /Accepted password for (\S+) from (\S+)/i,
    /session opened for user (\S+)/i,
    /Successfully authenticated user (\S+)/i,
  ],
  passwordChange: [
    /password changed for (\S+)/i,
    /password for (\S+) changed by/i,
    /user (\S+) changed password/i,
  ],
};

const securityEvents = {
  failedLogins: {
    count: 0,
    details: [],
  },
  successfulLogins: {
    count: 0,
    details: [],
  },
  passwordChanges: {
    count: 0,
    details: [],
  },
};

function processLogLine(line, filename) {
  // Check for failed logins
  for (const pattern of patterns.failedLogin) {
    const match = line.match(pattern);
    if (match) {
      const username = match[2] || match[1] || "unknown";
      securityEvents.failedLogins.count++;
      securityEvents.failedLogins.details.push({
        timestamp: extractTimestamp(line),
        username,
        source: filename,
      });
      return;
    }
  }

  // Check for successful logins
  for (const pattern of patterns.successfulLogin) {
    const match = line.match(pattern);
    if (match) {
      const username = match[1] || "unknown";
      securityEvents.successfulLogins.count++;
      securityEvents.successfulLogins.details.push({
        timestamp: extractTimestamp(line),
        username,
        source: filename,
      });
      return;
    }
  }

  // Check for password changes
  for (const pattern of patterns.passwordChange) {
    const match = line.match(pattern);
    if (match) {
      const username = match[1] || "unknown";
      securityEvents.passwordChanges.count++;
      securityEvents.passwordChanges.details.push({
        timestamp: extractTimestamp(line),
        username,
        source: filename,
      });
      return;
    }
  }
}

// Extract timestamp from log line
function extractTimestamp(line) {
  const timestampMatch = line.match(
    /^(\w{3}\s+\d+\s+\d+:\d+:\d+)|(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})|(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/
  );
  return timestampMatch ? timestampMatch[0] : "unknown";
}

async function processLogFile(filePath) {
  const filename = path.basename(filePath);
  console.log(`Processing ${filename}...`);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    processLogLine(line, filename);
  }
}

function generateReport() {
  const reportGenerationDate = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  }).format(reportGenerationDate);

  const report = [
    "SECURITY LOG ANALYSIS REPORT",
    "============================",
    `Generated: ${formattedDate}`,
    "",
    "EVENT SUMMARY",
    "--------------",
    `Failed logins: ${securityEvents.failedLogins.count}`,
    `Successful logins: ${securityEvents.successfulLogins.count}`,
    `Password changes: ${securityEvents.passwordChanges.count}`,
    "",
    "RECENT FAILED LOGINS",
    "-------------------",
  ];

  const recentFailedLogins = securityEvents.failedLogins.details
    .slice(-10)
    .reverse();
  if (recentFailedLogins.length === 0) {
    report.push("No failed logins recorded.");
  } else {
    recentFailedLogins.forEach((event) => {
      report.push(
        `[${event.timestamp}] User: ${event.username}, Source: ${event.source}`
      );
    });
  }

  report.push("");
  report.push("RECENT SUCCESSFUL LOGINS");
  report.push("------------------------");

  const recentSuccessfulLogins = securityEvents.successfulLogins.details
    .slice(-10)
    .reverse();
  if (recentSuccessfulLogins.length === 0) {
    report.push("No successful logins recorded.");
  } else {
    recentSuccessfulLogins.forEach((event) => {
      report.push(
        `[${event.timestamp}] User: ${event.username}, Source: ${event.source}`
      );
    });
  }

  report.push("");
  report.push("RECENT PASSWORD CHANGES");
  report.push("-----------------------");

  const recentPasswordChanges = securityEvents.passwordChanges.details
    .slice(-10)
    .reverse();
  if (recentPasswordChanges.length === 0) {
    report.push("No password changes recorded.");
  } else {
    recentPasswordChanges.forEach((event) => {
      report.push(
        `[${event.timestamp}] User: ${event.username}, Source: ${event.source}`
      );
    });
  }

  // Write the report to a new file
  fs.writeFileSync(reportFile, report.join("\n"));
  console.log(`Report saved to ${reportFile}`);
}

async function main() {
  try {
    const files = fs.readdirSync(logDirectory);
    for (const file of files) {
      await processLogFile(path.join(logDirectory, file));
    }
    generateReport();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
