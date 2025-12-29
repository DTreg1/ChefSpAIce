import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { format } from "date-fns";
import type { FoodItem, Recipe } from "@/lib/storage";

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return dateString;
  }
};

const escapeCSV = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export async function exportInventoryToCSV(inventory: FoodItem[]): Promise<void> {
  const headers = [
    "Name",
    "Category",
    "Quantity",
    "Unit",
    "Storage Location",
    "Purchase Date",
    "Expiration Date",
    "Notes",
    "Calories",
    "Protein (g)",
    "Carbs (g)",
    "Fat (g)",
  ];

  const rows = inventory.map((item) => [
    escapeCSV(item.name),
    escapeCSV(item.category),
    escapeCSV(item.quantity),
    escapeCSV(item.unit),
    escapeCSV(item.storageLocation),
    escapeCSV(formatDate(item.purchaseDate)),
    escapeCSV(formatDate(item.expirationDate)),
    escapeCSV(item.notes),
    escapeCSV(item.nutrition?.calories),
    escapeCSV(item.nutrition?.protein),
    escapeCSV(item.nutrition?.carbs),
    escapeCSV(item.nutrition?.fat),
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const fileName = `ChefSpAIce_Inventory_${format(new Date(), "yyyy-MM-dd")}.csv`;
  await shareFile(csvContent, fileName, "text/csv");
}

export async function exportRecipesToCSV(recipes: Recipe[]): Promise<void> {
  const headers = [
    "Title",
    "Description",
    "Cuisine",
    "Prep Time (min)",
    "Cook Time (min)",
    "Total Time (min)",
    "Servings",
    "Ingredients",
    "Instructions",
    "Dietary Tags",
    "Is Favorite",
    "Created Date",
    "Calories",
    "Protein (g)",
    "Carbs (g)",
    "Fat (g)",
  ];

  const rows = recipes.map((recipe) => [
    escapeCSV(recipe.title),
    escapeCSV(recipe.description),
    escapeCSV(recipe.cuisine),
    escapeCSV(recipe.prepTime),
    escapeCSV(recipe.cookTime),
    escapeCSV(recipe.prepTime + recipe.cookTime),
    escapeCSV(recipe.servings),
    escapeCSV(recipe.ingredients.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join("; ")),
    escapeCSV(recipe.instructions.join("; ")),
    escapeCSV(recipe.dietaryTags?.join(", ")),
    escapeCSV(recipe.isFavorite ? "Yes" : "No"),
    escapeCSV(formatDate(recipe.createdAt)),
    escapeCSV(recipe.nutrition?.calories),
    escapeCSV(recipe.nutrition?.protein),
    escapeCSV(recipe.nutrition?.carbs),
    escapeCSV(recipe.nutrition?.fat),
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const fileName = `ChefSpAIce_Recipes_${format(new Date(), "yyyy-MM-dd")}.csv`;
  await shareFile(csvContent, fileName, "text/csv");
}

export async function exportInventoryToPDF(inventory: FoodItem[]): Promise<void> {
  const groupedByLocation: Record<string, FoodItem[]> = {};
  inventory.forEach((item) => {
    const loc = item.storageLocation || "Other";
    if (!groupedByLocation[loc]) groupedByLocation[loc] = [];
    groupedByLocation[loc].push(item);
  });

  const locationSections = Object.entries(groupedByLocation)
    .map(
      ([location, items]) => `
      <div class="location-section">
        <h2>${capitalizeFirst(location)}</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Category</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr class="${getExpiryClass(item.expirationDate)}">
                <td>${item.name}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${item.category || "-"}</td>
                <td>${formatDate(item.expirationDate) || "-"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>ChefSpAIce Inventory</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            color: #2C3E50;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #27AE60;
            padding-bottom: 15px;
          }
          .header h1 {
            color: #27AE60;
            margin: 0;
          }
          .header p {
            color: #666;
            margin: 5px 0 0;
          }
          .location-section {
            margin-bottom: 25px;
          }
          .location-section h2 {
            color: #27AE60;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          th {
            background-color: #f8f9fa;
            font-weight: 600;
          }
          .expired { color: #E74C3C; font-weight: 500; }
          .expiring-soon { color: #E67E22; }
          .summary {
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ChefSpAIce Inventory</h1>
          <p>Exported on ${format(new Date(), "MMMM d, yyyy")}</p>
        </div>
        ${locationSections}
        <div class="summary">
          <strong>Total Items:</strong> ${inventory.length} |
          <strong>Locations:</strong> ${Object.keys(groupedByLocation).length}
        </div>
      </body>
    </html>
  `;

  await generateAndSharePDF(html, `ChefSpAIce_Inventory_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export async function exportRecipesToPDF(recipes: Recipe[]): Promise<void> {
  const recipeCards = recipes
    .map(
      (recipe) => `
      <div class="recipe-card">
        <h2>${recipe.title}${recipe.isFavorite ? " ⭐" : ""}</h2>
        <p class="description">${recipe.description}</p>
        
        <div class="meta">
          <span>⏱ Prep: ${recipe.prepTime} min</span>
          <span>🍳 Cook: ${recipe.cookTime} min</span>
          <span>🍽 Servings: ${recipe.servings}</span>
          ${recipe.cuisine ? `<span>🌍 ${recipe.cuisine}</span>` : ""}
        </div>
        
        ${
          recipe.dietaryTags?.length
            ? `<div class="tags">${recipe.dietaryTags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>`
            : ""
        }
        
        <div class="section">
          <h3>Ingredients</h3>
          <ul>
            ${recipe.ingredients.map((i) => `<li>${i.quantity} ${i.unit} ${i.name}${i.isOptional ? " (optional)" : ""}</li>`).join("")}
          </ul>
        </div>
        
        <div class="section">
          <h3>Instructions</h3>
          <ol>
            ${recipe.instructions.map((step) => `<li>${step}</li>`).join("")}
          </ol>
        </div>
        
        ${
          recipe.nutrition
            ? `
          <div class="nutrition">
            <strong>Nutrition per serving:</strong>
            ${recipe.nutrition.calories} cal |
            ${recipe.nutrition.protein}g protein |
            ${recipe.nutrition.carbs}g carbs |
            ${recipe.nutrition.fat}g fat
          </div>
        `
            : ""
        }
      </div>
    `,
    )
    .join('<div class="page-break"></div>');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>ChefSpAIce Recipes</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            color: #2C3E50;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #27AE60;
            padding-bottom: 15px;
          }
          .header h1 {
            color: #27AE60;
            margin: 0;
          }
          .header p {
            color: #666;
            margin: 5px 0 0;
          }
          .recipe-card {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
          }
          .recipe-card h2 {
            color: #27AE60;
            margin-bottom: 5px;
          }
          .description {
            color: #666;
            font-style: italic;
            margin-bottom: 15px;
          }
          .meta {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 15px;
            color: #495057;
          }
          .tags {
            margin-bottom: 15px;
          }
          .tag {
            display: inline-block;
            background: #e8f5e9;
            color: #27AE60;
            padding: 4px 10px;
            border-radius: 12px;
            margin-right: 8px;
            font-size: 12px;
          }
          .section h3 {
            color: #495057;
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
          }
          ul, ol {
            margin: 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 5px;
          }
          .nutrition {
            margin-top: 15px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 8px;
            font-size: 13px;
          }
          .page-break {
            page-break-after: always;
          }
          @media print {
            .page-break {
              page-break-after: always;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ChefSpAIce Recipes</h1>
          <p>Exported on ${format(new Date(), "MMMM d, yyyy")} • ${recipes.length} recipes</p>
        </div>
        ${recipeCards}
      </body>
    </html>
  `;

  await generateAndSharePDF(html, `ChefSpAIce_Recipes_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export async function exportSingleRecipeToPDF(recipe: Recipe): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${recipe.title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 30px;
            color: #2C3E50;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #27AE60;
            margin-bottom: 10px;
            font-size: 28px;
          }
          .description {
            color: #666;
            font-style: italic;
            font-size: 16px;
            margin-bottom: 20px;
          }
          .meta {
            display: flex;
            gap: 25px;
            flex-wrap: wrap;
            margin-bottom: 25px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .meta-item {
            text-align: center;
          }
          .meta-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
          }
          .meta-value {
            font-size: 18px;
            font-weight: 600;
            color: #27AE60;
          }
          .tags {
            margin-bottom: 25px;
          }
          .tag {
            display: inline-block;
            background: #e8f5e9;
            color: #27AE60;
            padding: 5px 12px;
            border-radius: 15px;
            margin-right: 8px;
            font-size: 13px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section h2 {
            color: #27AE60;
            font-size: 18px;
            border-bottom: 2px solid #27AE60;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .ingredients-list {
            list-style: none;
            padding: 0;
          }
          .ingredients-list li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .ingredients-list li:last-child {
            border-bottom: none;
          }
          .quantity {
            font-weight: 600;
            color: #27AE60;
          }
          .optional {
            color: #999;
            font-style: italic;
          }
          .instructions-list {
            counter-reset: step;
            list-style: none;
            padding: 0;
          }
          .instructions-list li {
            counter-increment: step;
            padding: 12px 0 12px 50px;
            position: relative;
            border-bottom: 1px solid #eee;
          }
          .instructions-list li::before {
            content: counter(step);
            position: absolute;
            left: 0;
            width: 35px;
            height: 35px;
            background: #27AE60;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
          }
          .nutrition-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
          }
          .nutrition-item {
            text-align: center;
            padding: 10px;
          }
          .nutrition-value {
            font-size: 24px;
            font-weight: 700;
            color: #27AE60;
          }
          .nutrition-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>${recipe.title}</h1>
        <p class="description">${recipe.description}</p>
        
        <div class="meta">
          <div class="meta-item">
            <div class="meta-label">Prep Time</div>
            <div class="meta-value">${recipe.prepTime} min</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Cook Time</div>
            <div class="meta-value">${recipe.cookTime} min</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Total Time</div>
            <div class="meta-value">${recipe.prepTime + recipe.cookTime} min</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Servings</div>
            <div class="meta-value">${recipe.servings}</div>
          </div>
          ${
            recipe.cuisine
              ? `
            <div class="meta-item">
              <div class="meta-label">Cuisine</div>
              <div class="meta-value">${recipe.cuisine}</div>
            </div>
          `
              : ""
          }
        </div>
        
        ${
          recipe.dietaryTags?.length
            ? `
          <div class="tags">
            ${recipe.dietaryTags.map((t) => `<span class="tag">${t}</span>`).join("")}
          </div>
        `
            : ""
        }
        
        <div class="section">
          <h2>Ingredients</h2>
          <ul class="ingredients-list">
            ${recipe.ingredients
              .map(
                (i) => `
              <li>
                <span class="quantity">${i.quantity} ${i.unit}</span> ${i.name}
                ${i.isOptional ? '<span class="optional">(optional)</span>' : ""}
              </li>
            `,
              )
              .join("")}
          </ul>
        </div>
        
        <div class="section">
          <h2>Instructions</h2>
          <ol class="instructions-list">
            ${recipe.instructions.map((step) => `<li>${step}</li>`).join("")}
          </ol>
        </div>
        
        ${
          recipe.nutrition
            ? `
          <div class="section">
            <h2>Nutrition (per serving)</h2>
            <div class="nutrition-box">
              <div class="nutrition-item">
                <div class="nutrition-value">${recipe.nutrition.calories}</div>
                <div class="nutrition-label">Calories</div>
              </div>
              <div class="nutrition-item">
                <div class="nutrition-value">${recipe.nutrition.protein}g</div>
                <div class="nutrition-label">Protein</div>
              </div>
              <div class="nutrition-item">
                <div class="nutrition-value">${recipe.nutrition.carbs}g</div>
                <div class="nutrition-label">Carbs</div>
              </div>
              <div class="nutrition-item">
                <div class="nutrition-value">${recipe.nutrition.fat}g</div>
                <div class="nutrition-label">Fat</div>
              </div>
            </div>
          </div>
        `
            : ""
        }
        
        <div class="footer">
          Generated by ChefSpAIce on ${format(new Date(), "MMMM d, yyyy")}
        </div>
      </body>
    </html>
  `;

  const safeTitle = recipe.title.replace(/[^a-zA-Z0-9]/g, "_");
  await generateAndSharePDF(html, `${safeTitle}.pdf`);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getExpiryClass(expirationDate: string | undefined): string {
  if (!expirationDate) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "expired";
  if (daysUntil <= 3) return "expiring-soon";
  return "";
}

async function shareFile(content: string, fileName: string, mimeType: string): Promise<void> {
  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = FileSystem.documentDirectory + fileName;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: `Share ${fileName}`,
    });
  }
}

async function generateAndSharePDF(html: string, fileName: string): Promise<void> {
  if (Platform.OS === "web") {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });

  const newUri = FileSystem.documentDirectory + fileName;
  await FileSystem.moveAsync({
    from: uri,
    to: newUri,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(newUri, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${fileName}`,
    });
  }
}

export type ExportFormat = "csv" | "pdf";
export type ExportType = "inventory" | "recipes";

export async function exportData(
  type: ExportType,
  format: ExportFormat,
  data: FoodItem[] | Recipe[],
): Promise<void> {
  if (type === "inventory") {
    if (format === "csv") {
      await exportInventoryToCSV(data as FoodItem[]);
    } else {
      await exportInventoryToPDF(data as FoodItem[]);
    }
  } else {
    if (format === "csv") {
      await exportRecipesToCSV(data as Recipe[]);
    } else {
      await exportRecipesToPDF(data as Recipe[]);
    }
  }
}
