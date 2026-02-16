# ChefSpAIce Architecture Diagrams

Reference links to all FigJam diagrams documenting the app's architecture and flows. Last updated: February 2026.

---

## Navigation

| Diagram | Description | Link |
|---------|-------------|------|
| Full Navigation Flow (Mobile & Web) | Complete navigation map showing all screens, tabs, modals, and navigation paths | [View in FigJam](https://www.figma.com/board/EEz6iHh0QuTThEopj0ZwOH/ChefSpAIce-Full-Navigation-Flow--Mobile---Web-?node-id=0-1&p=f&t=AmDZcLOGEDtIBSkR-0) |
| Complete User Journey | Full flow from app launch through auth, onboarding, STANDARD subscription to all main features | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/2a9e0543-0cd1-4c63-9d17-222f8a8673aa?utm_source=other&utm_content=edit_in_figjam) |

## Flowcharts

| Diagram | Description | Link |
|---------|-------------|------|
| Food Item Lifecycle | Tracks a food item from addition through consumption or waste | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/b53ce98b-bec4-4b87-afb8-288cd4dff638?utm_source=other&utm_content=edit_in_figjam) |
| AI Recipe Generation Flow | End-to-end AI recipe generation process | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/d99df89c-c727-48ab-9457-f113f925feab?utm_source=other&utm_content=edit_in_figjam) |
| Barcode and Receipt Scanning Flow | Scanning items via barcode or receipt image | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/e756a7af-791b-46aa-8d1a-bd5245d6da49?utm_source=other&utm_content=edit_in_figjam) |
| Subscription Gate Flow (STANDARD Tier) | Blocking paywall with single STANDARD plan, Stripe/StoreKit payment paths, no-dismiss behavior | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/a57a0e7d-1931-4b14-b514-34090309e15a?utm_source=other&utm_content=edit_in_figjam) |
| USDA Food Search Flow | Searching USDA FoodData Central for nutritional information | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/07dc8db2-e127-4425-aef4-e9b0a7f02fb5?utm_source=other&utm_content=edit_in_figjam) |
| USDA Barcode Lookup Flow | Looking up food items by barcode via USDA | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/9c676233-5c90-4e25-b13f-049696d1270f?utm_source=other&utm_content=edit_in_figjam) |
| USDA Portion Conversion System | Converting between portion sizes using USDA data | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/9de20c6a-d2ec-4c74-8148-971b614c70e1?utm_source=other&utm_content=edit_in_figjam) |
| Food Item Data Flow: Search to Inventory | How searched food items flow into the inventory system | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/e7a1b8f6-eae7-406d-9ea7-516db525f8ef?utm_source=other&utm_content=edit_in_figjam) |
| Instacart Integration Flow | Shopping list to Instacart product matching and delivery | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/99f40702-eb9f-4e0e-a3f5-693e8eeca6c5?utm_source=other&utm_content=edit_in_figjam) |
| App Store Compliance Checklist | Completed vs pending pre-submission tasks | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/5ae39357-2e05-4d6a-9691-ca1866058b8b?utm_source=other&utm_content=edit_in_figjam) |

## Sequence Diagrams

| Diagram | Description | Link |
|---------|-------------|------|
| Cloud Sync Process | Local-first sync between device and cloud | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/8dd9c97c-1176-47b5-9ddc-070b6ec8da5f?utm_source=other&utm_content=edit_in_figjam) |
| Authentication Flow | Sign-in via email, Apple, and Google | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/ca1c1d53-555b-43c9-8b8b-619e60101bb6?utm_source=other&utm_content=edit_in_figjam) |
| AI Recipe Request Flow | User to App to API to OpenAI to Database sequence | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/ab18c2a2-1ec6-43d2-95ad-400c3656b06d?utm_source=other&utm_content=edit_in_figjam) |
| AI Recipe Generation Sequence | Detailed User, App, API, OpenAI, Database interaction | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/dae46f44-9c52-4811-8741-9f6b8f194e38?utm_source=other&utm_content=edit_in_figjam) |

## State Diagrams

| Diagram | Description | Link |
|---------|-------------|------|
| Food Item States | States a food item can be in (fresh, expiring, expired, consumed, wasted) | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/18ccf134-9aa6-4ee5-ae5f-87e977a2e605?utm_source=other&utm_content=edit_in_figjam) |
| Subscription States (STANDARD Tier) | All subscription states (active, past_due, canceled, expired) and transitions | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/bfecbcc4-c81e-4e99-80c2-879c9600b51b?utm_source=other&utm_content=edit_in_figjam) |
| Sync Status States | States for the data sync system | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/2714f84c-1120-4ec1-a237-b9b658e6f335?utm_source=other&utm_content=edit_in_figjam) |

## Decision Trees

| Diagram | Description | Link |
|---------|-------------|------|
| Recipe Suggestion Decision Tree | How the app decides which recipes to suggest | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/924651ff-d869-4272-893e-45de3cee5a7c?utm_source=other&utm_content=edit_in_figjam) |
| Expiration Notification Prioritization | How expiring item notifications are prioritized | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/d6536348-1d7d-46fc-8839-9e8c3acb7097?utm_source=other&utm_content=edit_in_figjam) |

## Roadmaps

| Diagram | Description | Link |
|---------|-------------|------|
| ChefSpAIce Development Roadmap | High-level development timeline and milestones | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/4f6e15c0-2de1-44e2-bc39-e2b3cc55bcc1?utm_source=other&utm_content=edit_in_figjam) |

## Legacy Diagrams (Archived)

These reflect the old multi-tier/trial subscription model and are kept for reference only.

| Diagram | Description | Link |
|---------|-------------|------|
| Subscription Gate Flow (Legacy) | Old flow with Basic/Pro tier selection | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/d16ff429-587d-45ba-847d-b15b1498fdf3?utm_source=other&utm_content=edit_in_figjam) |
| Complete User Journey (Legacy) | Old journey with trial flow | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/e4bda78b-2a26-482f-932e-39643d659c09?utm_source=other&utm_content=edit_in_figjam) |
| Subscription State Diagram (Legacy) | Old states including trial | [View in FigJam](https://www.figma.com/online-whiteboard/create-diagram/6db7849e-c5e7-442f-baf8-6b2fc0495221?utm_source=other&utm_content=edit_in_figjam) |

## Notes

- Click any link to open the diagram in FigJam
- You may be prompted to save the diagram to your Figma account on first access
- Diagrams can be edited, shared, and organized within your Figma workspace
