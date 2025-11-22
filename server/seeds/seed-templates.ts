import { storage } from "./storage";

async function seedTemplates() {
  const templates = [
    {
      name: "Thank you for reaching out",
      content: "Thank you for reaching out. I appreciate your message and will review it carefully.",
      context: "email",
      tone: "formal",
    },
    {
      name: "Apologies for the delay",
      content: "I apologize for the delayed response. I've been reviewing your message and wanted to provide you with a thoughtful reply.",
      context: "email",
      tone: "apologetic",
    },
    {
      name: "Let me look into this",
      content: "Thank you for bringing this to my attention. I'll investigate this matter and get back to you with more information.",
      context: "message",
      tone: "solution-focused",
    },
    {
      name: "I understand your concern",
      content: "I understand your concern and appreciate you taking the time to share it with me. Let me address your points.",
      context: "customer_complaint",
      tone: "empathetic",
    },
    {
      name: "Following up on our conversation",
      content: "I'm following up on our recent conversation about {topic}. I wanted to check in and see if you had any additional questions.",
      context: "email",
      tone: "friendly",
    },
    {
      name: "Request for more information",
      content: "Thank you for your message. To better assist you, could you please provide more details about {specific_information}?",
      context: "email",
      tone: "formal",
    },
    {
      name: "Scheduling a meeting",
      content: "I'd be happy to discuss this further. Would you be available for a meeting next week? Please let me know what times work best for you.",
      context: "email",
      tone: "professional",
    },
    {
      name: "Project update",
      content: "I wanted to provide you with a quick update on {project}. We've made good progress and are on track to meet our deadline.",
      context: "message",
      tone: "casual",
    },
  ];

  console.log("Seeding draft templates...");
  
  for (const template of templates) {
    try {
      await storage.createDraftTemplate({
        contextType: template.context,
        templatePrompt: template.content,
        isActive: true,
      });
      console.log(`✓ Created template: ${template.name}`);
    } catch (error) {
      console.error(`✗ Failed to create template "${template.name}":`, error);
    }
  }
  
  console.log("Template seeding complete!");
}

// Run if this file is executed directly
if (require.main === module) {
  seedTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

export { seedTemplates };