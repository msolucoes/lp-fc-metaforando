export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_URL = process.env.AC_API_URL;
  const API_KEY = process.env.AC_API_KEY;
  const TAG_NAME = process.env.AC_TAG_NAME || 'L26 AFC | Inscritos';

  if (!API_URL || !API_KEY) {
    return res.status(500).json({ error: 'API not configured' });
  }

  const { name, email, phone, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;

  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // 1. Create or update contact
    const nameParts = (name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const contactResponse = await fetch(`${API_URL}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact: {
          email: email,
          firstName: firstName,
          lastName: lastName,
          phone: phone || '',
          fieldValues: [
            { field: 'utm_source', value: utm_source || '' },
            { field: 'utm_medium', value: utm_medium || '' },
            { field: 'utm_campaign', value: utm_campaign || '' },
            { field: 'utm_content', value: utm_content || '' },
            { field: 'utm_term', value: utm_term || '' }
          ]
        }
      })
    });

    const contactData = await contactResponse.json();

    if (!contactResponse.ok) {
      console.error('AC contact error:', JSON.stringify(contactData));
      return res.status(502).json({ error: 'Failed to create contact', details: contactData });
    }

    const contactId = contactData.contact.id;

    // 2. Find or create the tag
    const tagSearchResponse = await fetch(
      `${API_URL}/api/3/tags?search=${encodeURIComponent(TAG_NAME)}`,
      { headers: { 'Api-Token': API_KEY } }
    );
    const tagSearchData = await tagSearchResponse.json();

    let tagId;
    if (tagSearchData.tags && tagSearchData.tags.length > 0) {
      tagId = tagSearchData.tags[0].id;
    } else {
      // Create the tag if it doesn't exist
      const createTagResponse = await fetch(`${API_URL}/api/3/tags`, {
        method: 'POST',
        headers: {
          'Api-Token': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tag: { tag: TAG_NAME, tagType: 'contact' }
        })
      });
      const createTagData = await createTagResponse.json();
      tagId = createTagData.tag.id;
    }

    // 3. Add tag to contact
    await fetch(`${API_URL}/api/3/contactTags`, {
      method: 'POST',
      headers: {
        'Api-Token': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactTag: { contact: contactId, tag: tagId }
      })
    });

    return res.status(200).json({ success: true, contactId: contactId });

  } catch (error) {
    console.error('AC error:', error);
    return res.status(502).json({ error: 'ActiveCampaign request failed' });
  }
}
