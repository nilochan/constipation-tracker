const fs = require('fs');

// Parse WhatsApp chat format: [2/1/17, 22:43:27] Name: Message
function parseWhatsAppChat(content) {
  const lines = content.split('\n');
  const messages = [];
  
  for (const line of lines) {
    // Skip empty lines and system messages
    if (!line.trim() || line.includes('end-to-end encrypted')) continue;
    
    // WhatsApp format: [2/1/17, 22:43:27] Name: Message
    const match = line.match(/\[([^\]]+)\]\s*([^:]+):\s*(.+)/);
    if (match) {
      const [, dateTime, sender, message] = match;
      
      try {
        // Convert WhatsApp date format to ISO string
        // Format: "2/1/17, 22:43:27" -> "2017-02-01T22:43:27Z"
        const [datePart, timePart] = dateTime.split(', ');
        const [month, day, year] = datePart.split('/');
        const fullYear = year.length === 2 ? `20${year}` : year;
        const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}Z`;
        
        messages.push({
          sender: sender.trim(),
          message: message.trim(),
          timestamp: isoDate
        });
      } catch (error) {
        console.log('Error parsing WhatsApp date:', dateTime, error.message);
        // Still add message with current date if parsing fails
        messages.push({
          sender: sender.trim(),
          message: message.trim(),
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  return messages;
}

// Parse LINE chat format: 23:12	nilo chan	Message
function parseLINEChat(content) {
  const lines = content.split('\n');
  const messages = [];
  let currentDate = null;
  
  for (const line of lines) {
    // Skip empty lines and headers
    if (!line.trim() || line.includes('Chat history') || line.includes('Saved on:')) continue;
    
    // Check for date headers: "Sat, 31/12/2016"
    const dateMatch = line.match(/^[A-Za-z]{3},\s*(\d{1,2}\/\d{1,2}\/\d{4})$/);
    if (dateMatch) {
      const [, datePart] = dateMatch;
      const [day, month, year] = datePart.split('/');
      currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      continue;
    }
    
    // Parse message lines: "23:12	nilo chan	Message"
    const messageMatch = line.match(/^(\d{2}:\d{2})\t([^\t]+)\t(.+)$/);
    if (messageMatch && currentDate) {
      const [, time, sender, message] = messageMatch;
      
      try {
        // Combine date and time
        const timestamp = `${currentDate}T${time}:00Z`;
        
        messages.push({
          sender: sender.trim(),
          message: message.trim(),
          timestamp: timestamp
        });
      } catch (error) {
        console.log('Error parsing LINE timestamp:', time, error.message);
        messages.push({
          sender: sender.trim(),
          message: message.trim(),
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  return messages;
}

// Main function to convert chat files
function convertChatFile(filePath, outputPath) {
  console.log(`📁 Reading chat file: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  let messages = [];
  let source = 'other';
  
  // Detect format and parse
  if (filePath.toLowerCase().includes('whatsapp') || content.includes('] ') && content.includes(': ')) {
    console.log('🟢 Detected WhatsApp format');
    messages = parseWhatsAppChat(content);
    source = 'whatsapp';
  } else if (filePath.toLowerCase().includes('line') || content.includes('Chat history')) {
    console.log('🔵 Detected LINE format');
    messages = parseLINEChat(content);
    source = 'line';
  } else {
    console.log('❓ Unknown format, trying WhatsApp parser...');
    messages = parseWhatsAppChat(content);
  }
  
  // Create upload JSON
  const uploadData = {
    source: source,
    chatHistory: messages
  };
  
  // Save to file
  fs.writeFileSync(outputPath, JSON.stringify(uploadData, null, 2));
  
  console.log(`✅ Converted ${messages.length} messages`);
  console.log(`💾 Saved to: ${outputPath}`);
  console.log(`📊 Date range: ${messages[0]?.timestamp} to ${messages[messages.length-1]?.timestamp}`);
  
  return uploadData;
}

// Convert your chat files
try {
  console.log('🚀 Converting WhatsApp chat...');
  convertChatFile('C:\\Users\\chanc\\whatapp_chat.txt', 'C:\\Users\\chanc\\whatsapp-upload.json');
  
  console.log('\n🚀 Converting LINE chat...');
  convertChatFile('C:\\Users\\chanc\\[LINE] Chat with my wife .txt', 'C:\\Users\\chanc\\line-upload.json');
  
  console.log('\n🎉 Conversion complete! You can now upload these JSON files to your tracker.');
} catch (error) {
  console.error('❌ Error:', error.message);
}