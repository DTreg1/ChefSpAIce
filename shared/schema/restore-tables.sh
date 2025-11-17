#!/bin/bash

# Function to extract table name from insertXSchema pattern
get_table_from_insert() {
  local insert_name="$1"
  # Remove "insert" prefix and "Schema" suffix, convert to camelCase table name
  local table=$(echo "$insert_name" | sed 's/^insert//; s/Schema$//; s/^\(.\)/\L\1/')
  # Handle pluralization heuristics
  echo "$table"
}

# Fix each file
for file in billing.ts content.ts experiments.ts extraction.ts forms.ts images.ts pricing.ts scheduling.ts security.ts sentiment.ts support.ts transcription.ts; do
  echo "Fixing $file..."
  
  # Read line by line and fix createInsertSchema() with missing table parameter
  awk '
  /export const insert.*Schema = createInsertSchema\(\)/ {
    # Extract the schema name
    match($0, /export const (insert[A-Za-z]+Schema)/, arr)
    schema_name = arr[1]
    
    # Convert insertXxxYyySchema -> xxxYyy (remove insert prefix and Schema suffix)
    table_name = substr(schema_name, 7) # Remove "insert"
    sub(/Schema$/, "", table_name) # Remove "Schema" suffix
    
    # Convert first char to lowercase for table name
    table_name = tolower(substr(table_name, 1, 1)) substr(table_name, 2)
    
    # Replace the line with fixed version
    sub(/createInsertSchema\(\)/, "createInsertSchema(" table_name ")")
  }
  { print }
  ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  
done

echo "All files restored!"
