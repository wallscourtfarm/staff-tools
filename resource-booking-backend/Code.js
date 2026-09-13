// Booking System — Cross-device sync via Google Apps Script

  const PREFIX = 'booking_';

  // Shared light token (same scheme as every other WFA tool's own
  // backend) — a deterrent, not real access control, but this endpoint
  // previously had none at all.
  function tokenOK_(e) {
    const want = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
    return !!(e && e.parameter && e.parameter.token && e.parameter.token === want);
  }

  function doPost(e) {
    if (!tokenOK_(e)) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'unauthorised' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    try {                                                                                                                                                                                                                              
      const payload = JSON.parse(e.postData.contents);                                                                                                                                                                                   
                                                                                   
      // Save bookings for a week                                                                                                                                                                                                        
      if (payload.action === 'saveBookings' && payload.weekKey) {                                                                                                                                                                        
        const key = PREFIX + payload.weekKey;                                                                                                                                                                                            
        PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(payload.bookings));                                                                                                                                      
        return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))                                                                                                                                                         
          .setMimeType(ContentService.MimeType.JSON);                              
      }                                                     
                                                                                                                                                                                                                                         
      return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))                                                                                                                                               
        .setMimeType(ContentService.MimeType.JSON);                                                                                                                                                                                      
    } catch (err) {                                                                                                                                                                                                                      
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))                                                                                                                                  
        .setMimeType(ContentService.MimeType.JSON);                                                                                                                                                                                      
    }                                                                                                                                                                                                                                    
  }                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                         
  function doGet(e) {
    if (!tokenOK_(e)) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'unauthorised' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    try {
      const action = e.parameter.action;                                                                                                                                                                                             
                                                                                                                                                                                                                                         
      // Load bookings for a week                                                                                                                                                                                                        
      if (action === 'loadBookings' && e.parameter.weekKey) {                                                                                                                                                                            
        const key = PREFIX + e.parameter.weekKey;                                                                                                                                                                                        
        const raw = PropertiesService.getScriptProperties().getProperty(key);                                                                                                                                                            
        const bookings = raw ? JSON.parse(raw) : {};                                                                                                                                                                                     
        return ContentService.createTextOutput(JSON.stringify({ bookings }))
          .setMimeType(ContentService.MimeType.JSON);                                                                                                                                                                                    
      }                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                         
      // List all stored weeks (for debugging)                                                                                                                                                                                           
      if (action === 'list') {                                                                                                                                                                                                           
        const props = PropertiesService.getScriptProperties().getProperties();                                                                                                                                                           
        const weeks = Object.keys(props).filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length));                                                                                                                             
        return ContentService.createTextOutput(JSON.stringify({ weeks }))                                                                                                                                                                
          .setMimeType(ContentService.MimeType.JSON);                                                                                                                                                                                    
      }                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                         
      return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))                                                                                                                                               
        .setMimeType(ContentService.MimeType.JSON);                                
    } catch (err) {                                                                                                                                                                                                                      
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))                                                                                                                                  
        .setMimeType(ContentService.MimeType.JSON);                                                                                                                                                                                      
    }                                                                                                                                                                                                                                    
  }