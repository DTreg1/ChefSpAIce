# Remove orphaned field lines that weren't properly deleted
/^    startedAt: true,$/d
/^    timestamp: true,$/d
# Remove orphaned closing brace + newline patterns before .extend
s/^  $//
s/^  })$//
s/^})$/\
/
