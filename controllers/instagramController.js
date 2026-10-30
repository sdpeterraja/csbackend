// controllers/instagramController.js
const axios = require('axios');

// In-memory store fallback when MongoDB model isn't used or for fast demo persistence
let igConfigStore = {
  connected: true,
  igAccountId: '17841405822304914',
  username: 'catalogstack.official',
  pageId: '10492819384712',
  accessToken: '',
  verifyToken: 'ig_automation_verify_2026',
  followersCount: 18420,
  updatedAt: new Date().toISOString()
};

let igPostsStore = [
  {
    id: 'ig_post_101',
    mediaType: 'REELS',
    caption: '🚀 How we automated 10,000+ customer DMs in 30 days! Comment "LINK" below and I will DM you the full blueprint & template pack directly 👇✨ #automation #growth #marketing',
    mediaUrl: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/p/C8x9Km2P1aQ/',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    likesCount: 1420,
    commentsCount: 384
  },
  {
    id: 'ig_post_102',
    mediaType: 'CAROUSEL_ALBUM',
    caption: '🔥 Summer Flash Drop is LIVE! 40% OFF all premium kits for the next 24 hours. Drop "SHOP" or "PRICE" in the comments to get your secret checkout link in DM! 🛍️⚡',
    mediaUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/p/C8v4Lp9N2bR/',
    timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    likesCount: 985,
    commentsCount: 219
  },
  {
    id: 'ig_post_103',
    mediaType: 'IMAGE',
    caption: '📦 Behind the scenes of our new AI Omnichannel Workflow engine. Want early beta access? Comment "BETA" and check your DMs!',
    mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/p/C8r1Hj8K9cT/',
    timestamp: new Date(Date.now() - 9 * 86400000).toISOString(),
    likesCount: 642,
    commentsCount: 128
  },
  {
    id: 'ig_post_104',
    mediaType: 'REELS',
    caption: '💡 5 WhatsApp & Instagram hacks every e-commerce founder needs in 2026. Comment "GUIDE" and we will send the free PDF straight to your inbox!',
    mediaUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://www.instagram.com/p/C8m7Fg3W4zL/',
    timestamp: new Date(Date.now() - 14 * 86400000).toISOString(),
    likesCount: 2150,
    commentsCount: 512
  }
];

let igAutomationsStore = [
  {
    id: 'ig_auto_1',
    name: 'Reel Blueprint Link Auto-DM',
    status: 'Active',
    postSelection: 'specific', // 'specific' | 'all'
    postId: 'ig_post_101',
    postCaption: '🚀 How we automated 10,000+ customer DMs in 30 days! Comment "LINK" below...',
    postMediaUrl: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&auto=format&fit=crop&q=80',
    postPermalink: 'https://www.instagram.com/p/C8x9Km2P1aQ/',
    triggerType: 'keywords', // 'keywords' | 'any'
    keywords: ['LINK', 'BLUEPRINT', 'TEMPLATE', 'SEND'],
    caseSensitive: false,
    autoReplyComment: true,
    commentReplies: [
      'Just sent the blueprint link to your DMs! Check your inbox 📩✨',
      'Sent! Check your message requests for the direct link 🚀',
      'Dropped it in your DMs! Let me know what you think 🙌'
    ],
    dmMessage: 'Hey @{{username}}! 👋 Thanks for commenting! Here is the direct link to download the Automation Blueprint & Template Pack:',
    linkUrl: 'https://catalogstack.in/blueprint-pack',
    linkButtonText: 'Download Blueprint 🔗',
    linkTitle: '2026 Growth & DM Automation Blueprint',
    requireFollow: false,
    stats: {
      commentsTriggered: 342,
      dmsSent: 340,
      linkClicks: 218
    },
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'ig_auto_2',
    name: 'Summer Flash Sale 40% Off Link',
    status: 'Active',
    postSelection: 'specific',
    postId: 'ig_post_102',
    postCaption: '🔥 Summer Flash Drop is LIVE! 40% OFF all premium kits for the next 24 hours...',
    postMediaUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    postPermalink: 'https://www.instagram.com/p/C8v4Lp9N2bR/',
    triggerType: 'keywords',
    keywords: ['SHOP', 'PRICE', 'DEAL', 'DISCOUNT'],
    caseSensitive: false,
    autoReplyComment: true,
    commentReplies: [
      'Check your DMs! Just sent your secret 40% OFF checkout link 🛍️🔥',
      'Sent you the VIP discount link in DM! 💌'
    ],
    dmMessage: 'Hi @{{username}}! 🎉 Your secret 40% OFF Flash Sale code is auto-applied at the link below. Tap to claim before stock runs out:',
    linkUrl: 'https://shop.acme.com/flash-sale?code=IGVIP40',
    linkButtonText: 'Claim 40% OFF Now 🛍️',
    linkTitle: 'VIP Summer Flash Drop — 40% OFF',
    requireFollow: true,
    stats: {
      commentsTriggered: 189,
      dmsSent: 185,
      linkClicks: 134
    },
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  }
];

let igActivityLogs = [
  {
    id: 'log_1',
    timestamp: new Date(Date.now() - 180000).toISOString(),
    username: 'alex_growth',
    commentText: 'LINK please! 🔥',
    postId: 'ig_post_101',
    matchedKeyword: 'LINK',
    commentReplySent: 'Just sent the blueprint link to your DMs! Check your inbox 📩✨',
    dmSent: true,
    linkUrl: 'https://catalogstack.in/blueprint-pack',
    status: 'DELIVERED'
  },
  {
    id: 'log_2',
    timestamp: new Date(Date.now() - 720000).toISOString(),
    username: 'sarah.designs',
    commentText: 'Can you send me the PRICE?',
    postId: 'ig_post_102',
    matchedKeyword: 'PRICE',
    commentReplySent: 'Check your DMs! Just sent your secret 40% OFF checkout link 🛍️🔥',
    dmSent: true,
    linkUrl: 'https://shop.acme.com/flash-sale?code=IGVIP40',
    status: 'DELIVERED'
  }
];

exports.getConfig = async (req, res) => {
  return res.status(200).json({
    success: true,
    config: igConfigStore
  });
};

exports.saveConfig = async (req, res) => {
  try {
    const { igAccountId, username, pageId, accessToken, verifyToken, connected } = req.body;
    igConfigStore = {
      ...igConfigStore,
      igAccountId: igAccountId !== undefined ? igAccountId : igConfigStore.igAccountId,
      username: username ? username.replace(/^@/, '') : igConfigStore.username,
      pageId: pageId !== undefined ? pageId : igConfigStore.pageId,
      accessToken: accessToken !== undefined ? accessToken : igConfigStore.accessToken,
      verifyToken: verifyToken || igConfigStore.verifyToken,
      connected: connected !== undefined ? connected : true,
      updatedAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message: `Connected to Instagram Business Account @${igConfigStore.username}`,
      config: igConfigStore
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPosts = async (req, res) => {
  try {
    // If real access token and igAccountId are configured, try fetching live media from Graph API
    if (igConfigStore.accessToken && igConfigStore.igAccountId && igConfigStore.accessToken.length > 30) {
      try {
        const graphRes = await axios.get(
          `https://graph.facebook.com/v20.0/${igConfigStore.igAccountId}/media`,
          {
            params: {
              fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
              access_token: igConfigStore.accessToken,
              limit: 12
            },
            timeout: 4000
          }
        );
        if (graphRes.data && Array.isArray(graphRes.data.data) && graphRes.data.data.length > 0) {
          const livePosts = graphRes.data.data.map((m) => ({
            id: m.id,
            mediaType: m.media_type || 'IMAGE',
            caption: m.caption || 'Instagram Post',
            mediaUrl: m.thumbnail_url || m.media_url,
            permalink: m.permalink,
            timestamp: m.timestamp,
            likesCount: m.like_count || 0,
            commentsCount: m.comments_count || 0
          }));
          return res.status(200).json({ success: true, data: livePosts, source: 'graph_api' });
        }
      } catch (graphErr) {
        console.warn('Instagram Graph API media fetch fallback to stored posts:', graphErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: igPostsStore,
      source: 'synced'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCustomPost = async (req, res) => {
  try {
    const { caption, mediaUrl, permalink, mediaType } = req.body;
    const newPost = {
      id: `ig_post_${Date.now()}`,
      mediaType: mediaType || 'REELS',
      caption: caption || 'New Instagram Post',
      mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop&q=80',
      permalink: permalink || 'https://www.instagram.com/p/custom/',
      timestamp: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0
    };
    igPostsStore = [newPost, ...igPostsStore];
    return res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAutomations = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: igAutomationsStore,
    logs: igActivityLogs
  });
};

exports.createAutomation = async (req, res) => {
  try {
    const {
      name,
      status,
      postSelection,
      postId,
      triggerType,
      keywords,
      caseSensitive,
      autoReplyComment,
      commentReplies,
      dmMessage,
      linkUrl,
      linkButtonText,
      linkTitle,
      requireFollow
    } = req.body;

    const matchedPost = igPostsStore.find((p) => p.id === postId) || igPostsStore[0];

    const newAuto = {
      id: `ig_auto_${Date.now()}`,
      name: name || 'Comment to Link DM',
      status: status || 'Active',
      postSelection: postSelection || 'specific',
      postId: postSelection === 'all' ? 'ALL_POSTS' : (matchedPost?.id || postId),
      postCaption: postSelection === 'all' ? 'All Instagram Posts & Reels' : (matchedPost?.caption || ''),
      postMediaUrl: matchedPost?.mediaUrl || 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&auto=format&fit=crop&q=80',
      postPermalink: matchedPost?.permalink || 'https://www.instagram.com',
      triggerType: triggerType || 'keywords',
      keywords: Array.isArray(keywords) && keywords.length > 0 ? keywords : ['LINK'],
      caseSensitive: !!caseSensitive,
      autoReplyComment: autoReplyComment !== undefined ? autoReplyComment : true,
      commentReplies: Array.isArray(commentReplies) && commentReplies.length > 0
        ? commentReplies
        : ['Just sent you the link in your DMs! Check your inbox 📩✨'],
      dmMessage: dmMessage || 'Hey @{{username}}! 👋 Here is the link you requested:',
      linkUrl: linkUrl || 'https://catalogstack.in',
      linkButtonText: linkButtonText || 'Get the Link 🔗',
      linkTitle: linkTitle || 'Requested Link',
      requireFollow: !!requireFollow,
      followGateMessage: req.body.followGateMessage || 'Hey @{{username}}! 👋 Looks like you aren\'t following us yet! Follow @catalogstack.official first, then tap "I\'m Following ✅" below to unlock your link immediately!',
      followButtonText: req.body.followButtonText || 'I\'m Following ✅ Unlock Link',
      notFollowingRetryMessage: req.body.notFollowingRetryMessage || 'Oops! Looks like the follow hasn\'t registered yet 😅 Tap Follow on @catalogstack.official first, then tap the button below again!',
      stats: {
        commentsTriggered: 0,
        dmsSent: 0,
        linkClicks: 0
      },
      createdAt: new Date().toISOString()
    };

    igAutomationsStore = [newAuto, ...igAutomationsStore];
    return res.status(201).json({
      success: true,
      data: newAuto,
      message: 'Instagram Comment-to-Link automation created!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    const idx = igAutomationsStore.findIndex((a) => a.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Instagram automation not found' });
    }

    const updates = req.body;
    let postFields = {};
    if (updates.postId && updates.postSelection !== 'all') {
      const matchedPost = igPostsStore.find((p) => p.id === updates.postId);
      if (matchedPost) {
        postFields = {
          postCaption: matchedPost.caption,
          postMediaUrl: matchedPost.mediaUrl,
          postPermalink: matchedPost.permalink
        };
      }
    } else if (updates.postSelection === 'all') {
      postFields = {
        postId: 'ALL_POSTS',
        postCaption: 'All Instagram Posts & Reels'
      };
    }

    igAutomationsStore[idx] = {
      ...igAutomationsStore[idx],
      ...updates,
      ...postFields,
      updatedAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: igAutomationsStore[idx],
      message: 'Instagram automation updated!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    igAutomationsStore = igAutomationsStore.filter((a) => a.id !== id);
    return res.status(200).json({
      success: true,
      message: 'Instagram automation deleted'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.simulateComment = async (req, res) => {
  try {
    const { postId, username = 'riya.creates', commentText = 'LINK', automationId, isFollower = true } = req.body;

    // Find matching active automation
    let candidateAutomations = igAutomationsStore.filter((a) => a.status === 'Active');
    if (automationId) {
      const specific = igAutomationsStore.find((a) => a.id === automationId);
      if (specific) candidateAutomations = [specific];
    } else if (postId) {
      candidateAutomations = candidateAutomations.filter(
        (a) => a.postSelection === 'all' || a.postId === postId
      );
    }

    let matchedAuto = null;
    let matchedKeyword = null;

    for (const auto of candidateAutomations) {
      if (auto.triggerType === 'any') {
        matchedAuto = auto;
        matchedKeyword = 'ANY_COMMENT';
        break;
      }
      const cleanComment = auto.caseSensitive ? commentText : commentText.toUpperCase();
      for (const kw of auto.keywords || []) {
        const cleanKw = auto.caseSensitive ? kw.trim() : kw.trim().toUpperCase();
        if (cleanKw && cleanComment.includes(cleanKw)) {
          matchedAuto = auto;
          matchedKeyword = kw;
          break;
        }
      }
      if (matchedAuto) break;
    }

    if (!matchedAuto) {
      return res.status(200).json({
        success: true,
        matched: false,
        message: 'No active Comment-to-DM rule matched the comment text on this post.'
      });
    }

    // Pick a rotating public comment reply
    const replies = matchedAuto.commentReplies && matchedAuto.commentReplies.length > 0
      ? matchedAuto.commentReplies
      : ['Just sent you the link in your DMs! Check your inbox 📩'];
    const chosenCommentReply = matchedAuto.autoReplyComment
      ? replies[Math.floor(Math.random() * replies.length)]
      : null;

    const cleanUsername = username.replace(/^@/, '');
    const personalizedDm = (matchedAuto.dmMessage || '')
      .replace(/\{\{\s*username\s*\}\}/gi, cleanUsername)
      .replace(/\{\{\s*first_name\s*\}\}/gi, cleanUsername);

    // Increment stats
    matchedAuto.stats = {
      commentsTriggered: (matchedAuto.stats?.commentsTriggered || 0) + 1,
      dmsSent: (matchedAuto.stats?.dmsSent || 0) + 1,
      linkClicks: matchedAuto.stats?.linkClicks || 0
    };

    const logEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      username: cleanUsername,
      commentText,
      postId: postId || matchedAuto.postId,
      matchedKeyword,
      commentReplySent: chosenCommentReply,
      dmSent: true,
      dmText: personalizedDm,
      linkUrl: matchedAuto.linkUrl,
      linkButtonText: matchedAuto.linkButtonText,
      linkTitle: matchedAuto.linkTitle,
      status: 'DELIVERED'
    };

    igActivityLogs = [logEntry, ...igActivityLogs.slice(0, 49)];

    return res.status(200).json({
      success: true,
      matched: true,
      automation: matchedAuto,
      simulation: {
        username: cleanUsername,
        commentText,
        matchedKeyword,
        isFollower,
        blockedByFollowGate: !!(matchedAuto.requireFollow && !isFollower),
        publicCommentReply: chosenCommentReply,
        dmPayload: {
          recipient: cleanUsername,
          text: (matchedAuto.requireFollow && !isFollower)
            ? (matchedAuto.followGateMessage || 'Hey @{{username}}! 👋 Follow us first, then tap below to unlock your link!').replace(/\{\{\s*username\s*\}\}/gi, cleanUsername)
            : personalizedDm,
          buttonText: (matchedAuto.requireFollow && !isFollower)
            ? (matchedAuto.followButtonText || 'I\'m Following ✅ Unlock Link')
            : (matchedAuto.linkButtonText || 'Get the Link 🔗'),
          linkUrl: matchedAuto.linkUrl,
          linkTitle: matchedAuto.linkTitle || 'Direct Link',
          requireFollow: matchedAuto.requireFollow
        },
        logEntry
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify if user is now following the Instagram Business Account (called when user taps "I'm Following ✅" in DM)
exports.verifyFollowAndUnlockLink = async (req, res) => {
  try {
    const { igScopedUserId, username = 'riya.creates', automationId, simulateIsFollowing = true } = req.body;
    const auto = igAutomationsStore.find((a) => a.id === automationId) || igAutomationsStore[0];

    let isFollowing = simulateIsFollowing;

    // If real Graph API token and igScopedUserId are provided, query Meta's User Profile API for is_user_follow_business
    if (igConfigStore.accessToken && igScopedUserId && igConfigStore.accessToken.length > 30) {
      try {
        const profileRes = await axios.get(`https://graph.facebook.com/v20.0/${igScopedUserId}`, {
          params: {
            fields: 'name,username,is_user_follow_business,is_business_follow_user',
            access_token: igConfigStore.accessToken
          },
          timeout: 4000
        });
        if (profileRes.data && typeof profileRes.data.is_user_follow_business === 'boolean') {
          isFollowing = profileRes.data.is_user_follow_business;
        }
      } catch (err) {
        console.warn('Meta Graph API is_user_follow_business check fallback:', err.message);
      }
    }

    const cleanUsername = username.replace(/^@/, '');

    if (!isFollowing) {
      return res.status(200).json({
        success: true,
        verifiedFollow: false,
        retryMessage: (
          auto?.notFollowingRetryMessage ||
          'Oops! Looks like the follow hasn\'t registered yet 😅 Make sure you tap Follow on our profile first, then click "I\'m Following ✅" again!'
        ).replace(/\{\{\s*username\s*\}\}/gi, cleanUsername),
        buttonText: auto?.followButtonText || 'I\'m Following ✅ Unlock Link'
      });
    }

    const unlockedDm = (auto?.dmMessage || 'Awesome, thanks for following @{{username}}! 🎉 Here is your unlocked link:')
      .replace(/\{\{\s*username\s*\}\}/gi, cleanUsername);

    return res.status(200).json({
      success: true,
      verifiedFollow: true,
      dmPayload: {
        recipient: cleanUsername,
        text: unlockedDm,
        buttonText: auto?.linkButtonText || 'Get the Link 🔗',
        linkUrl: auto?.linkUrl || 'https://catalogstack.in',
        linkTitle: auto?.linkTitle || 'Unlocked Link'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Meta Instagram Webhook Verification & Event Handler
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === igConfigStore.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'comments' && change.value) {
            const commentText = change.value.text || '';
            const mediaId = change.value.media?.id;
            const fromUsername = change.value.from?.username || 'ig_user';
            // Trigger automation logic
            await exports.simulateComment(
              { body: { postId: mediaId, username: fromUsername, commentText } },
              { status: () => ({ json: () => {} }) }
            );
          }
        }
      }
    }
    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Instagram webhook error:', error);
    return res.status(200).send('EVENT_RECEIVED');
  }
};

