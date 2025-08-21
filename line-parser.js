const fs = require('fs');

// Parse LINE chat format specifically
function parseLINEChat(content) {
  const lines = content.split('\n');
  const messages = [];
  let currentDate = null;
  
  console.log(`📋 Processing ${lines.length} lines...`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and headers
    if (!line || line.includes('Chat history') || line.includes('Saved on:')) continue;
    
    // Check for date headers: "Sat, 31/12/2016" or "Mon, 02/01/2017"
    const dateMatch = line.match(/^[A-Za-z]{3},\s*(\d{1,2}\/\d{1,2}\/\d{4})$/);
    if (dateMatch) {
      const [, datePart] = dateMatch;
      const [day, month, year] = datePart.split('/');
      currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log(`📅 Found date: ${datePart} -> ${currentDate}`);
      continue;
    }
    
    // Parse message lines: "23:12	nilo chan	Message"
    // Split by tab character
    const parts = line.split('\t');
    if (parts.length >= 3 && currentDate) {
      const time = parts[0].trim();
      const sender = parts[1].trim();
      const message = parts.slice(2).join('\t').trim(); // Join remaining parts as message
      
      // Validate time format (HH:MM)
      if (time.match(/^\d{2}:\d{2}$/)) {
        try {
          const timestamp = `${currentDate}T${time}:00Z`;
          
          messages.push({
            sender: sender,
            message: message,
            timestamp: timestamp
          });
          
          if (messages.length <= 5) {
            console.log(`✅ Parsed: ${sender}: ${message.substring(0, 30)}...`);
          }
        } catch (error) {
          console.log('❌ Error parsing LINE message:', line);
        }
      }
    }
  }
  
  return messages;
}

// Convert LINE chat file specifically
try {
  console.log('🔵 Converting LINE chat...');
  const content = fs.readFileSync('C:\\Users\\chanc\\[LINE] Chat with my wife .txt', 'utf8');
  const messages = parseLINEChat(content);
  
  const uploadData = {
    source: 'line',
    chatHistory: messages
  };
  
  fs.writeFileSync('C:\\Users\\chanc\\line-upload-fixed.json', JSON.stringify(uploadData, null, 2));
  
  console.log(`✅ Converted ${messages.length} LINE messages`);
  if (messages.length > 0) {
    console.log(`📊 Date range: ${messages[0]?.timestamp} to ${messages[messages.length-1]?.timestamp}`);
    console.log(`👥 Sample senders: ${[...new Set(messages.slice(0, 10).map(m => m.sender))].join(', ')}`);
  }
  console.log(`💾 Saved to: C:\\Users\\chanc\\line-upload-fixed.json`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}