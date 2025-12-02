#!/usr/bin/env node
/**
 * Script to fix property name mismatches (snake_case vs camelCase)
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..");

// Property name mappings from snake_case to camelCase
const PROPERTY_REPLACEMENTS = [
  // Ticket properties
  { pattern: /ticket\.submittedBy/g, replacement: "ticket.userId" },

  // Rule properties
  { pattern: /rule\.condition\b/g, replacement: "rule.conditions" },
  { pattern: /rule\.assigned_to/g, replacement: "rule.assignTo" },
  {
    pattern: /rule\.confidence_threshold/g,
    replacement: "rule.confidenceThreshold",
  },
  { pattern: /rule\.name/g, replacement: "rule.ruleName" },

  // Agent properties
  { pattern: /agent\.agent_id/g, replacement: "agent.agentId" },
  { pattern: /agent\.current_load/g, replacement: "agent.currentLoad" },
  { pattern: /agent\.max_capacity/g, replacement: "agent.maxCapacity" },
  { pattern: /agent\.metadata/g, replacement: "agent.expertiseArea" },
  { pattern: /agent\.skills/g, replacement: "agent.languages" },
  { pattern: /agent\.name/g, replacement: "agent.agentId" },

  // Routing properties
  { pattern: /routing\.metadata/g, replacement: "routing.notes" },
  { pattern: /routing\.ai_analysis/g, replacement: "routing.notes" },
  { pattern: /routing\.routing_method/g, replacement: "routing.routingReason" },
  { pattern: /routing\.routed_to/g, replacement: "routing.toAssignee" },

  // Object literals
  { pattern: /ticket_id:/g, replacement: "ticketId:" },
  { pattern: /routed_to:/g, replacement: "toAssignee:" },
  { pattern: /routing_method:/g, replacement: "routingReason:" },
  { pattern: /confidence_score:/g, replacement: "confidence:" },
  { pattern: /routing_reason:/g, replacement: "notes:" },
  { pattern: /rule_id:/g, replacement: "ruleId:" },
  { pattern: /ai_analysis:/g, replacement: "notes:" },

  // Property access
  { pattern: /\.routed_to\b/g, replacement: ".toAssignee" },
  { pattern: /\.metadata\b/g, replacement: ".notes" },
  { pattern: /\.ai_analysis\b/g, replacement: ".notes" },
  { pattern: /\.routing_method\b/g, replacement: ".routingReason" },
];

function fixAiRoutingService() {
  const filePath = path.join(
    PROJECT_ROOT,
    "server/services/aiRoutingService.ts",
  );
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  console.log("🔧 Fixing property names in aiRoutingService.ts...\n");

  // Apply all replacements
  PROPERTY_REPLACEMENTS.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  Fixing: ${matches[0]} → ${replacement}`);
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  // Special fixes for specific issues
  // Fix line 141: submittedBy doesn't exist
  content = content.replace(
    /Submitted By: \${ticket\.userId}/g,
    "User ID: ${ticket.userId}",
  );

  // Fix createTicketRouting calls - need to map to correct schema
  content = content.replace(
    /createTicketRouting\(\{([^}]+)\}\)/g,
    (match, props) => {
      let fixed = props;
      // Convert snake_case to camelCase in object literal
      fixed = fixed.replace(/ticket_id/g, "ticketId");
      fixed = fixed.replace(/routed_to/g, "toAssignee");
      fixed = fixed.replace(/routing_method/g, "routingReason");
      fixed = fixed.replace(/confidence_score/g, "confidence");
      fixed = fixed.replace(/routing_reason/g, "notes");
      fixed = fixed.replace(/rule_id/g, "ruleId");
      fixed = fixed.replace(/ai_analysis/g, "notes");
      fixed = fixed.replace(/metadata:/g, "notes:");
      return `createTicketRouting({${fixed}})`;
    },
  );

  // Fix agent.skills access - use a proper property that exists
  content = content.replace(
    /const agentSkills = agent\.languages;/g,
    "const agentSkills = agent.languages || [];",
  );

  // Fix property accesses on agents
  content = content.replace(/agent\.skills/g, "agent.languages");
  content = content.replace(/agent\.current_load/g, "agent.currentLoad || 0");
  content = content.replace(/agent\.max_capacity/g, "agent.maxCapacity || 10");

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log("\n✅ Fixed property name mismatches in aiRoutingService.ts");
  } else {
    console.log("No property name mismatches found.");
  }
}

// Main execution
function main() {
  console.log("=".repeat(60));
  console.log("Fixing Property Name Mismatches");
  console.log("=".repeat(60) + "\n");

  fixAiRoutingService();

  console.log("\n🎉 Property name fixes complete!");
}

// Run the script
main();
