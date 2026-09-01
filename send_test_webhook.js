const payload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1018588830881356",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "914447972953",
              "phone_number_id": "100000"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Jane Customer"
                },
                "wa_id": "14155552671"
              }
            ],
            "messages": [
              {
                "from": "14155552671",
                "id": "wamid.HBgLMTQxNTU1NTI2NzEVAgASGBQzQTU0OEQzMEUyOEUyMjc1NEEAA",
                "timestamp": "1694217180",
                "text": {
                  "body": "Hi, I just placed an order and I have a question!"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

fetch('http://localhost:5000/api/whatsapp/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
