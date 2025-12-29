import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { storage, FoodItem } from "@/lib/storage";
import { exportInventoryToCSV, exportInventoryToPDF } from "@/lib/export";

export function useInventoryExport() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const inventoryItems = await storage.getInventory();
        setItems(inventoryItems);
      } catch (error) {
        console.error("Error loading inventory for export:", error);
      }
    };
    loadItems();
  }, []);

  const handleExport = useCallback(() => {
    if (items.length === 0) {
      Alert.alert("No Data", "There are no inventory items to export.");
      return;
    }
    Alert.alert(
      "Export Inventory",
      "Choose export format:",
      [
        {
          text: "CSV (Spreadsheet)",
          onPress: async () => {
            setExporting(true);
            try {
              await exportInventoryToCSV(items);
            } catch (error) {
              Alert.alert("Export Failed", "Unable to export inventory. Please try again.");
            } finally {
              setExporting(false);
            }
          },
        },
        {
          text: "PDF (Document)",
          onPress: async () => {
            setExporting(true);
            try {
              await exportInventoryToPDF(items);
            } catch (error) {
              Alert.alert("Export Failed", "Unable to export inventory. Please try again.");
            } finally {
              setExporting(false);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [items]);

  return { handleExport, exporting, items };
}
