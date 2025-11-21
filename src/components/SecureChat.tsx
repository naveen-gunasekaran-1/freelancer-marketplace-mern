import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Lock, 
  Send, 
  Video, 
  Phone, 
  Monitor, 
  Calendar,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  Users,
  Paperclip,
  MoreVertical,
  Clock,
  Check,
  CheckCheck,
  Image as ImageIcon,
  File,
  Mic,
  Smile,
  Search,
  X,
  Download,
  Play
} from 'lucide-react';

interface SecureChatProps {
  conversationId: string;
  currentUserId: string;
  token: string;
  onBack?: () => void;
}

interface KeyPairs {
  encryptionKeyPair: CryptoKeyPair;
  signingKeyPair: CryptoKeyPair;
}

const SecureChat: React.FC<SecureChatProps> = ({ conversationId, currentUserId, token, onBack }) => {
  const [conversation, setConversation] = useState<any>(null);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [keys, setKeys] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'meetings' | 'documents' | 'tasks'>('chat');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | 'screen'>('voice');
  const [selectedConversationId, setSelectedConversationId] = useState(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const keysRef = useRef<any>(null);
  const isEncryptionReadyRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep refs in sync with state
  useEffect(() => {
    keysRef.current = keys;
    console.log('🔑 Keys updated in ref:', !!keys);
  }, [keys]);

  useEffect(() => {
    isEncryptionReadyRef.current = isEncryptionReady;
    console.log('🔐 Encryption ready updated in ref:', isEncryptionReady);
  }, [isEncryptionReady]);

  // Initialize E2E encryption keys
  useEffect(() => {
    initializeEncryption();
    loadAllConversations(); // Load all conversations on mount
    
    // Failsafe: if initialization takes too long, force it to complete
    const timeout = setTimeout(() => {
      if (isInitializing) {
        console.warn('⚠️ Encryption initialization timeout (2s) - forcing completion');
        setIsInitializing(false);
      }
    }, 2000); // 2 seconds timeout
    
    return () => clearTimeout(timeout);
  }, [selectedConversationId]);

  // Setup Socket.IO for real-time messages
  useEffect(() => {
    console.log('🔌 Setting up Socket.IO connection...');
    
    // Connect to Socket.IO server
    const socket = io({
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      // Join user's room
      socket.emit('join', { userId: currentUserId });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    // Listen for new encrypted messages
    socket.on('encrypted_message', async (data: any) => {
      console.log('📨 Received real-time message:', data);
      
      if (data.conversationId === selectedConversationId) {
        const msg = data.message;
        
        // Decrypt the message
        let decryptedContent = '[Encrypted]';
        
        // Get current values from refs
        const currentKeys = keysRef.current;
        const currentEncryptionReady = isEncryptionReadyRef.current;
        
        console.log('🔍 Decryption context:', {
          hasKeys: !!currentKeys,
          isEncryptionReady: currentEncryptionReady,
          signature: msg.signature?.substring(0, 30),
          isOwnMessage: msg.senderId === currentUserId
        });
        
        // If it's from the other user, decrypt it
        if (msg.senderId !== currentUserId) {
          try {
            // Check if it's basic encryption or full E2E
            if (msg.signature === 'BASIC_ENCRYPTION_NO_SIGNATURE') {
              // Basic encryption - use base64 decode
              console.log('🔓 Using base64 decode for basic encryption');
              decryptedContent = atob(msg.encryptedContent);
            } else if (currentEncryptionReady && currentKeys) {
              // Full E2E encryption - use RSA decryption
              console.log('🔐 Using RSA decryption for E2E encryption');
              console.log('🔐 Encrypted content preview:', msg.encryptedContent.substring(0, 50));
              console.log('🔐 Has private key:', !!currentKeys.encryptionKeyPair?.privateKey);
              
              try {
                // Decrypt using RSA
                const encryptedData = Uint8Array.from(atob(msg.encryptedContent), c => c.charCodeAt(0));
                console.log('🔐 Encrypted data length:', encryptedData.length);
                
                const decrypted = await window.crypto.subtle.decrypt(
                  { name: 'RSA-OAEP' },
                  currentKeys.encryptionKeyPair.privateKey,
                  encryptedData
                );
                const decoder = new TextDecoder();
                decryptedContent = decoder.decode(decrypted);
                console.log('✅ RSA decryption successful');
              } catch (decryptError) {
                console.error('❌ RSA decryption failed:', decryptError);
                console.error('Error details:', {
                  name: (decryptError as Error).name,
                  message: (decryptError as Error).message
                });
                throw decryptError;
              }
            } else {
              // Try base64 as fallback
              console.log('⚠️ Fallback to base64 decode (keys not ready)');
              try {
                decryptedContent = atob(msg.encryptedContent);
              } catch {
                decryptedContent = '[Waiting for encryption keys]';
              }
            }
            console.log('✅ Decrypted incoming message:', decryptedContent);
          } catch (error) {
            console.error('❌ Failed to decrypt incoming message:', error);
            decryptedContent = '[Decryption failed]';
          }
        } else {
          // It's our own message echoed back
          try {
            if (msg.signature === 'BASIC_ENCRYPTION_NO_SIGNATURE') {
              decryptedContent = atob(msg.encryptedContent);
            } else {
              // For RSA, we already have the plain text locally
              // But try to decrypt it anyway for consistency
              if (currentKeys) {
                const encryptedData = Uint8Array.from(atob(msg.encryptedContent), c => c.charCodeAt(0));
                const decrypted = await window.crypto.subtle.decrypt(
                  { name: 'RSA-OAEP' },
                  currentKeys.encryptionKeyPair.privateKey,
                  encryptedData
                );
                const decoder = new TextDecoder();
                decryptedContent = decoder.decode(decrypted);
              } else {
                decryptedContent = '[Own message - keys not available]';
              }
            }
          } catch (error) {
            console.error('❌ Error with own message:', error);
            decryptedContent = msg.encryptedContent;
          }
        }
        
        // Add to messages list
        setMessages(prev => [...prev, {
          ...msg,
          content: decryptedContent,
          status: msg.senderId !== currentUserId ? 'delivered' : (msg.status || 'sent')
        }]);
        
        // If it's not our own message, mark it as delivered
        if (msg.senderId !== currentUserId && (msg._id || msg.messageId)) {
          const messageId = msg._id || msg.messageId;
          console.log('📨 Marking received message as delivered:', messageId);
          try {
            await fetch(`/api/secure-conversations/${conversationId}/messages/${messageId}/delivered`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            console.log('✅ Marked message as delivered:', messageId);
          } catch (error) {
            console.error('❌ Failed to mark message as delivered:', error);
          }
        }
        
        // Scroll to bottom
        setTimeout(() => scrollToBottom(), 100);
      }
    });

    // Listen for encryption ready event
    socket.on('encryption_ready', (data: any) => {
      console.log('🔐 Encryption ready notification:', data);
      if (data.conversationId === conversationId) {
        setIsEncryptionReady(true);
      }
    });

    // Listen for message delivered status
    socket.on('message_delivered', (data: any) => {
      console.log('✅ Message delivered event received:', data);
      console.log('🔍 Current selectedConversationId:', selectedConversationId);
      console.log('🔍 Message conversationId:', data.conversationId);
      
      // Check if this event is for the current conversation
      if (data.conversationId !== selectedConversationId) {
        console.log('⏭️ Skipping - different conversation');
        return;
      }
      
      setMessages(prevMessages => {
        console.log('🔎 Looking for message:', data.messageId);
        console.log('🔎 Total messages in state:', prevMessages.length);
        
        let foundMessage = false;
        const updated = prevMessages.map(msg => {
          console.log('🔍 Checking message:', { 
            _id: msg._id, 
            messageId: msg.messageId, 
            currentStatus: msg.status,
            matches: (msg._id === data.messageId || msg.messageId === data.messageId)
          });
          
          if (msg._id === data.messageId || msg.messageId === data.messageId) {
            foundMessage = true;
            console.log('✨ FOUND MESSAGE! Updating from', msg.status, 'to delivered');
            return { ...msg, status: 'delivered', deliveredAt: data.deliveredAt };
          }
          return msg;
        });
        
        if (!foundMessage) {
          console.error('❌ MESSAGE NOT FOUND IN STATE!');
        } else {
          console.log('✅ Message updated successfully');
        }
        
        console.log('📊 Updated messages:', updated.filter(m => m._id === data.messageId || m.messageId === data.messageId));
        return updated;
      });
    });

    // Listen for messages read status
    socket.on('messages_read', (data: any) => {
      console.log('👁️ Messages read event received:', data);
      console.log('🔍 Current selectedConversationId:', selectedConversationId);
      console.log('🔍 Message conversationId:', data.conversationId);
      
      // Check if this event is for the current conversation
      if (data.conversationId !== selectedConversationId) {
        console.log('⏭️ Skipping - different conversation');
        return;
      }
      
      setMessages(prevMessages => {
        const updated = prevMessages.map(msg =>
          msg.senderId === currentUserId && msg.receiverId === data.readBy
            ? { ...msg, status: 'read', isRead: true, readAt: data.readAt }
            : msg
        );
        console.log('📊 Updated messages after read:', updated.filter(m => m.status === 'read').length, 'messages marked as read');
        return updated;
      });
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting Socket.IO...');
      socket.disconnect();
    };
  }, [selectedConversationId, currentUserId, token]);

  // IndexedDB key storage for persistent encryption keys
  const openKeyStore = async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FreelancerMarketplaceKeys', 2); // Version 2 for sentMessages store
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        // Version 1: Create keys store
        if (oldVersion < 1 && !db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'conversationId' });
        }
        
        // Version 2: Create sentMessages store
        if (oldVersion < 2 && !db.objectStoreNames.contains('sentMessages')) {
          db.createObjectStore('sentMessages', { keyPath: 'messageId' });
        }
      };
    });
  };

  const saveKeysToIndexedDB = async (
    conversationId: string,
    encryptionKeyPair: CryptoKeyPair,
    signingKeyPair: CryptoKeyPair
  ) => {
    try {
      const db = await openKeyStore();
      
      // Export keys to storable format (JWK)
      const encryptionPublicJwk = await window.crypto.subtle.exportKey('jwk', encryptionKeyPair.publicKey);
      const encryptionPrivateJwk = await window.crypto.subtle.exportKey('jwk', encryptionKeyPair.privateKey);
      const signingPublicJwk = await window.crypto.subtle.exportKey('jwk', signingKeyPair.publicKey);
      const signingPrivateJwk = await window.crypto.subtle.exportKey('jwk', signingKeyPair.privateKey);
      
      const keyData = {
        conversationId,
        encryptionPublic: encryptionPublicJwk,
        encryptionPrivate: encryptionPrivateJwk,
        signingPublic: signingPublicJwk,
        signingPrivate: signingPrivateJwk,
        timestamp: Date.now()
      };
      
      const transaction = db.transaction(['keys'], 'readwrite');
      const store = transaction.objectStore('keys');
      await store.put(keyData);
      
      console.log('🔒 Keys saved to IndexedDB for conversation:', conversationId);
      db.close();
    } catch (error) {
      console.error('❌ Error saving keys to IndexedDB:', error);
    }
  };

  const loadKeysFromIndexedDB = async (conversationId: string): Promise<KeyPairs | null> => {
    try {
      const db = await openKeyStore();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const request = store.get(conversationId);
        
        request.onsuccess = async () => {
          const data = request.result;
          db.close();
          
          if (!data) {
            resolve(null);
            return;
          }
          
          try {
            // Import keys from JWK format
            const encryptionPublicKey = await window.crypto.subtle.importKey(
              'jwk',
              data.encryptionPublic,
              { name: 'RSA-OAEP', hash: 'SHA-256' },
              true,
              ['encrypt']
            );
            
            const encryptionPrivateKey = await window.crypto.subtle.importKey(
              'jwk',
              data.encryptionPrivate,
              { name: 'RSA-OAEP', hash: 'SHA-256' },
              true,
              ['decrypt']
            );
            
            const signingPublicKey = await window.crypto.subtle.importKey(
              'jwk',
              data.signingPublic,
              { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
              true,
              ['verify']
            );
            
            const signingPrivateKey = await window.crypto.subtle.importKey(
              'jwk',
              data.signingPrivate,
              { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
              true,
              ['sign']
            );
            
            console.log('🔓 Keys loaded from IndexedDB for conversation:', conversationId);
            resolve({
              encryptionKeyPair: { publicKey: encryptionPublicKey, privateKey: encryptionPrivateKey },
              signingKeyPair: { publicKey: signingPublicKey, privateKey: signingPrivateKey }
            });
          } catch (error) {
            console.error('❌ Error importing keys:', error);
            resolve(null);
          }
        };
        
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error loading keys from IndexedDB:', error);
      return null;
    }
  };

  const clearStoredKeys = async (conversationId: string) => {
    try {
      const db = await openKeyStore();
      const transaction = db.transaction(['keys'], 'readwrite');
      const store = transaction.objectStore('keys');
      await store.delete(conversationId);
      db.close();
      console.log('🗑️ Keys cleared from IndexedDB for conversation:', conversationId);
    } catch (error) {
      console.error('❌ Error clearing keys:', error);
    }
  };

  // Store plaintext of sent messages for display after reload
  const saveSentMessagePlaintext = async (messageId: string, plaintext: string) => {
    try {
      const db = await openKeyStore();
      const transaction = db.transaction(['sentMessages'], 'readwrite');
      const store = transaction.objectStore('sentMessages');
      await store.put({ messageId, plaintext, timestamp: Date.now() });
      db.close();
      console.log('💾 Saved sent message plaintext to IndexedDB:', messageId);
    } catch (error) {
      console.error('❌ Error saving sent message plaintext:', error);
    }
  };

  const getSentMessagePlaintext = async (messageId: string): Promise<string | null> => {
    try {
      const db = await openKeyStore();
      
      if (!db.objectStoreNames.contains('sentMessages')) {
        db.close();
        return null;
      }
      
      return new Promise((resolve) => {
        const transaction = db.transaction(['sentMessages'], 'readonly');
        const store = transaction.objectStore('sentMessages');
        const request = store.get(messageId);
        
        request.onsuccess = () => {
          db.close();
          resolve(request.result?.plaintext || null);
        };
        
        request.onerror = () => {
          db.close();
          resolve(null);
        };
      });
    } catch (error) {
      console.error('❌ Error getting sent message plaintext:', error);
      return null;
    }
  };

  const initializeEncryption = async () => {
    try {
      console.log('🔐 Starting encryption initialization...');
      
      // Try to load existing keys from IndexedDB
      console.log('🔍 Checking for existing keys in IndexedDB...');
      const savedKeys = await loadKeysFromIndexedDB(conversationId);
      
      if (savedKeys) {
        console.log('✅ Found existing keys! Restoring from IndexedDB...');
        keysRef.current = savedKeys;
        setKeys(savedKeys);
        
        // Export public key to share with server
        const publicKeyBuffer = await window.crypto.subtle.exportKey(
          'spki',
          savedKeys.encryptionKeyPair.publicKey
        );
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
        
        // Exchange keys with server
        await exchangePublicKeys(publicKeyBase64);
      } else {
        console.log('🔑 No existing keys found. Generating new keypairs...');
        
        // Generate new encryption keypair
        const encryptionKeyPair = await window.crypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          },
          true,
          ['encrypt', 'decrypt']
        );

        // Generate new signing keypair
        const signingKeyPair = await window.crypto.subtle.generateKey(
          {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          },
          true,
          ['sign', 'verify']
        );

        console.log('✅ New keypairs generated');

        keysRef.current = { encryptionKeyPair, signingKeyPair };
        setKeys({ encryptionKeyPair, signingKeyPair });

        // Save keys to IndexedDB for persistence
        await saveKeysToIndexedDB(conversationId, encryptionKeyPair, signingKeyPair);

        // Export public key for exchange
        const publicKeyBuffer = await window.crypto.subtle.exportKey(
          'spki',
          encryptionKeyPair.publicKey
        );
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

        console.log('🔄 Exchanging public keys with server...');
        await exchangePublicKeys(publicKeyBase64);
      }
      
      // Load conversation details
      console.log('📥 Loading conversation details...');
      await loadConversation();
      
      console.log('📨 Loading messages...');
      await loadMessages();
      
      console.log('✅ Encryption initialization complete with persistent keys');
      setIsInitializing(false);
    } catch (error) {
      console.error('❌ Error initializing encryption:', error);
      setIsInitializing(false);
    }
  };

  const exchangePublicKeys = async (publicKey: string) => {
    try {
      const response = await fetch(
        `/api/secure-conversations/${conversationId}/exchange-keys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ publicKey }),
        }
      );

      const data = await response.json();
      console.log('🔑 Server encryption status:', data.encryptionReady);
      setIsEncryptionReady(data.encryptionReady);
      isEncryptionReadyRef.current = data.encryptionReady; // Update ref immediately!
    } catch (error) {
      console.error('Error exchanging keys:', error);
    }
  };

  const loadConversation = async () => {
    try {
      const response = await fetch(
        `/api/secure-conversations/${selectedConversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversation loaded:', data);
        console.log('📋 Encryption status:', {
          clientPublicKey: !!data.encryption.clientPublicKey,
          freelancerPublicKey: !!data.encryption.freelancerPublicKey,
          bothKeysPresent: !!(data.encryption.clientPublicKey && data.encryption.freelancerPublicKey)
        });
        
        setConversation(data);
        const encryptionReady = !!(data.encryption.clientPublicKey && data.encryption.freelancerPublicKey);
        setIsEncryptionReady(encryptionReady);
        isEncryptionReadyRef.current = encryptionReady; // Update ref immediately!
        console.log('🔐 Encryption ready:', encryptionReady);
      } else {
        console.error('❌ Failed to load conversation:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
    }
  };

  const loadAllConversations = async () => {
    try {
      const response = await fetch('/api/secure-conversations/my-conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 All conversations loaded:', data.length);
        setAllConversations(data);
      }
    } catch (error) {
      console.error('Error loading conversations list:', error);
    }
  };

  const handleConversationSwitch = (newConversationId: string) => {
    if (newConversationId === selectedConversationId) return;
    
    console.log('🔄 Switching conversation:', newConversationId);
    setIsSwitchingConversation(true);
    setSelectedConversationId(newConversationId);
    setMessages([]);
    
    // Don't show initialization screen when switching, just clear and reload
    setTimeout(() => {
      setIsSwitchingConversation(false);
    }, 100);
  };

  const loadMessages = async () => {
    console.log('🔄 loadMessages() called');
    console.trace('Call stack:'); // This will show where it's being called from
    
    // Use refs for most up-to-date values (critical after reload!)
    const currentKeys = keysRef.current || keys;
    const currentEncryptionReady = isEncryptionReadyRef.current || isEncryptionReady;
    
    console.log('🔑 Current encryption state:', {
      hasKeys: !!currentKeys,
      encryptionReady: currentEncryptionReady
    });
    
    try {
      const response = await fetch(
        `/api/secure-conversations/${conversationId}/messages?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const encryptedMessages = await response.json();
        console.log('📨 Loaded messages:', encryptedMessages.length);
        
        // Decrypt messages
        const decryptedMessages = await Promise.all(
          encryptedMessages.map(async (msg: any, index: number) => {
            console.log(`🔍 Processing message ${index + 1}:`, {
              messageId: msg.messageId,
              senderId: msg.senderId,
              currentUserId,
              isOwnMessage: msg.senderId === currentUserId,
              encryptedContentLength: msg.encryptedContent?.length,
              encryptedContentPreview: msg.encryptedContent?.substring(0, 50),
              signature: msg.signature?.substring(0, 30)
            });

            // Determine message type
            const isBasicEncryption = msg.signature === 'BASIC_ENCRYPTION_NO_SIGNATURE';
            const isOwnMessage = msg.senderId === currentUserId;
            const isReceivedMessage = msg.recipientId === currentUserId;
            
            try {
              // For own messages sent - check if we have plaintext stored locally
              if (isOwnMessage && !isReceivedMessage) {
                console.log('📝 Checking for stored plaintext of own message');
                const plaintext = await getSentMessagePlaintext(msg.messageId);
                if (plaintext) {
                  console.log('✅ Found stored plaintext');
                  return { ...msg, content: plaintext };
                } else {
                  console.log('⚠️ No stored plaintext - message encrypted for recipient');
                  return { ...msg, content: '[Message sent]' };
                }
              }
              
              // Strategy 1: Basic encryption (base64)
              if (isBasicEncryption) {
                console.log('🔓 Using base64 decode (basic encryption)');
                const decoded = atob(msg.encryptedContent);
                console.log('✅ Decoded message:', decoded.substring(0, 50));
                return { ...msg, content: decoded };
              }
              
              // Strategy 2: Full E2E encryption (RSA) - only decrypt messages encrypted FOR US
              if (isReceivedMessage && currentEncryptionReady && currentKeys) {
                console.log('🔐 Using RSA decryption (E2E encryption)');
                
                // Decrypt using current keys from ref
                const encryptedData = Uint8Array.from(atob(msg.encryptedContent), c => c.charCodeAt(0));
                const decrypted = await window.crypto.subtle.decrypt(
                  { name: 'RSA-OAEP' },
                  currentKeys.encryptionKeyPair.privateKey,
                  encryptedData
                );
                const decoder = new TextDecoder();
                const decryptedContent = decoder.decode(decrypted);
                
                console.log('✅ RSA decrypted message:', decryptedContent.substring(0, 50));
                return { ...msg, content: decryptedContent };
              }
              
              // Strategy 3: Fallback to base64 if keys not ready yet
              console.log('⚠️ Attempting base64 fallback (keys not ready)');
              try {
                const decoded = atob(msg.encryptedContent);
                return { ...msg, content: decoded };
              } catch {
                console.warn('⚠️ All decryption methods failed');
                return { ...msg, content: '[Waiting for encryption keys]' };
              }
              
            } catch (error) {
              console.error('❌ Decryption failed:', error);
              console.error('Error details:', {
                name: (error as Error).name,
                message: (error as Error).message,
                hasKeys: !!currentKeys,
                encryptionReady: currentEncryptionReady
              });
              return { ...msg, content: '[Decryption failed]' };
            }
          })
        );
        console.log('✅ Decrypted messages:', decryptedMessages.length);
        setMessages(decryptedMessages.reverse());
        
        // Mark unread messages as read
        const unreadMessageIds = decryptedMessages
          .filter(msg => msg.recipientId === currentUserId && !msg.isRead && msg.status !== 'read')
          .map(msg => msg.messageId);
        
        if (unreadMessageIds.length > 0) {
          try {
            await fetch(
              `/api/secure-conversations/${conversationId}/messages/read`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ messageIds: unreadMessageIds }),
              }
            );
            console.log('✅ Marked messages as read:', unreadMessageIds.length);
          } catch (error) {
            console.error('❌ Failed to mark messages as read:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  const encryptMessage = async (message: string, recipientPublicKey: string): Promise<string> => {
    try {
      // Convert base64 public key to CryptoKey
      const publicKeyBuffer = Uint8Array.from(atob(recipientPublicKey), c => c.charCodeAt(0));
      const importedKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      );

      // Encrypt message
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        importedKey,
        data
      );

      return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  };

  const decryptMessage = async (encryptedMessage: string): Promise<string> => {
    try {
      // Use keysRef for the most up-to-date keys (important after reload)
      const currentKeys = keysRef.current || keys;
      if (!currentKeys) {
        console.log('⚠️ Keys not available for decryption');
        return '[Keys not initialized]';
      }

      const encryptedData = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        currentKeys.encryptionKeyPair.privateKey,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('❌ Error decrypting message:', error);
      return '[Decryption failed]';
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    try {
      // Use keysRef for the most up-to-date keys
      const currentKeys = keysRef.current || keys;
      if (!currentKeys) throw new Error('Keys not initialized');

      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const signature = await window.crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' },
        currentKeys.signingKeyPair.privateKey,
        data
      );

      return btoa(String.fromCharCode(...new Uint8Array(signature)));
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  const calculateHash = async (message: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation) return;

    const originalMessage = newMessage; // Store original before clearing
    
    try {
      let encryptedContent, signature, contentHash;
      
      console.log('📤 Sending message:', originalMessage);
      console.log('🔑 Keys available:', !!keys);
      console.log('🔐 Encryption ready:', isEncryptionReady);
      
      // If encryption is ready, use full E2E encryption
      if (isEncryptionReady && keys) {
        console.log('🔐 Using full E2E encryption');
        
        // Determine recipient's public key
        const isClient = conversation.clientId._id === currentUserId;
        const recipientPublicKey = isClient
          ? conversation.encryption.freelancerPublicKey
          : conversation.encryption.clientPublicKey;

        console.log('📋 Encryption details:', {
          currentUserId,
          clientId: conversation.clientId._id,
          freelancerId: conversation.freelancerId._id,
          isClient,
          recipientRole: isClient ? 'freelancer' : 'client',
          recipientPublicKeyPreview: recipientPublicKey?.substring(0, 50),
          myPublicKeyPreview: keys.publicKey?.substring(0, 50)
        });

        if (!recipientPublicKey) {
          throw new Error('Recipient public key not found');
        }

        // Encrypt message
        encryptedContent = await encryptMessage(originalMessage, recipientPublicKey);
        
        // Create signature
        signature = await signMessage(originalMessage);
        
        // Calculate hash
        contentHash = await calculateHash(originalMessage);
      } else {
        // Basic encryption fallback
        console.log('⚠️ Using basic encryption (base64)');
        encryptedContent = btoa(originalMessage); // Simple base64 encoding
        contentHash = await calculateHash(originalMessage);
        signature = 'BASIC_ENCRYPTION_NO_SIGNATURE'; // Dummy signature for basic encryption
      }

      console.log('📤 Encrypted content length:', encryptedContent.length);

      const response = await fetch(
        `/api/secure-conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            encryptedContent,
            contentHash,
            signature: signature || undefined,
            messageType: 'text',
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Message sent successfully', result);
        console.log('📊 Initial status:', result.status || 'sent');
        
        // Save plaintext of sent message to IndexedDB for later retrieval
        await saveSentMessagePlaintext(result.messageId, originalMessage);
        
        // Add message to local state (PLAIN TEXT for sender to see)
        const newMsg = {
          messageId: result.messageId,
          _id: result.messageId,
          senderId: currentUserId,
          content: originalMessage, // Store plain text, not encrypted
          createdAt: result.timestamp,
          isRead: false,
          status: result.status || 'sent' // Use status from server or default to 'sent'
        };
        console.log('📤 Adding message to local state:', newMsg);
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        scrollToBottom();
      } else {
        console.error('❌ Failed to send message:', response.status);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
      handleFileUpload(Array.from(files));
    }
  };

  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', conversationId);

        const response = await fetch(
          `/api/secure-conversations/${conversationId}/upload`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log('✅ File uploaded:', result);
          
          // Send file message
          setMessages(prev => [...prev, {
            messageId: result.messageId,
            _id: result.messageId,
            senderId: currentUserId,
            content: file.name,
            messageType: 'file',
            fileUrl: result.fileUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            createdAt: new Date(),
            isRead: false,
            status: 'sent'
          }]);
          scrollToBottom();
        }
      } catch (error) {
        console.error('❌ File upload failed:', error);
      }
    }
    setSelectedFiles([]);
  };

  const startCall = (type: 'voice' | 'video' | 'screen') => {
    setCallType(type);
    setShowCallModal(true);
    // Implement WebRTC call logic here
    console.log(`Starting ${type} call...`);
  };

  const scheduleMeeting = async (meetingData: any) => {
    try {
      const response = await fetch(
        `/api/secure-conversations/${conversationId}/meetings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(meetingData),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Meeting scheduled:', result);
        await loadMeetings();
      }
    } catch (error) {
      console.error('❌ Failed to schedule meeting:', error);
    }
  };

  const loadMeetings = async () => {
    try {
      const response = await fetch(
        `/api/secure-conversations/${conversationId}/meetings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(
        `/api/secure-conversations/${conversationId}/documents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch(
        `/api/secure-conversations/${conversationId}/tasks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'meetings') loadMeetings();
    if (activeTab === 'documents') loadDocuments();
    if (activeTab === 'tasks') loadTasks();
  }, [activeTab]);

  // Only show initialization screen on first load, not when switching conversations
  if (isInitializing && !isSwitchingConversation && allConversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md px-4">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Initializing Secure Connection
          </h2>
          <p className="text-gray-600 mb-4">Setting up end-to-end encryption...</p>
          <button
            onClick={() => {
              console.log('🚀 Manual skip initialization');
              setIsInitializing(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue Without Waiting
          </button>
          <p className="text-xs text-gray-500 mt-2">Initialization is taking longer than expected</p>
        </div>
      </div>
    );
  }

  if (!conversation && !isSwitchingConversation) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center px-4">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Conversation Not Found
          </h2>
          <p className="text-gray-600">Unable to load secure conversation.</p>
        </div>
      </div>
    );
  }

  // Show loading state when switching conversations
  if (isSwitchingConversation || !conversation) {
    return (
      <div className="flex h-full bg-white">
        {/* Keep sidebar visible during switch */}
        <div className="w-80 bg-purple-800 text-white flex flex-col">
          <div className="px-4 py-3 border-b border-purple-700">
            <h1 className="font-bold text-xl">Freelancer Chat</h1>
            <div className="flex items-center mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-sm text-purple-200">Online</span>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-purple-700 text-white placeholder-purple-300 pl-10 pr-4 py-2 rounded border-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="mb-4">
              <h2 className="px-3 py-2 text-xs font-semibold text-purple-300 uppercase">Direct Messages</h2>
              <div className="space-y-1">
                {allConversations.map((conv) => {
                  const otherUser = conv.clientId._id === currentUserId 
                    ? conv.freelancerId 
                    : conv.clientId;
                  const isActive = conv.conversationId === selectedConversationId;
                  
                  return (
                    <div 
                      key={conv._id}
                      onClick={() => handleConversationSwitch(conv.conversationId)}
                      className={`px-3 py-2 rounded hover:bg-purple-700 cursor-pointer transition-colors ${
                        isActive ? 'bg-purple-700' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="relative">
                          {otherUser.profileImage ? (
                            <img src={otherUser.profileImage} alt={otherUser.name} className="w-8 h-8 rounded" />
                          ) : (
                            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-sm font-bold">
                              {otherUser.name[0].toUpperCase()}
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-purple-700 rounded-full"></div>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{otherUser.name}</span>
                            <span className="text-xs text-purple-300">
                              {new Date(conv.lastActivity).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-purple-200 truncate mt-0.5">
                            {conv.jobId?.title || 'Start conversation'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-purple-700">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-sm font-bold">
                {currentUserId[0]?.toUpperCase()}
              </div>
              <span className="ml-2 text-sm font-medium">You</span>
            </div>
          </div>
        </div>

        {/* Loading state for main area */}
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  const partner = conversation.clientId._id === currentUserId 
    ? conversation.freelancerId 
    : conversation.clientId;

  return (
    <div className="flex h-full bg-white">
      {/* Left Sidebar - Hidden in overlay mode */}
      <div className="hidden">
        {/* Sidebar content hidden when in overlay */}
      </div>

      {/* Main Chat Area - Full Width */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-14 md:h-16 border-b border-gray-200 px-3 md:px-6 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              title="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="relative">
              {partner.profileImage ? (
                <img src={partner.profileImage} alt={partner.name} className="w-8 h-8 md:w-10 md:h-10 rounded" />
              ) : (
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm md:text-base">
                  {partner.name[0].toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-2 h-2 md:w-3 md:h-3 bg-green-400 border-2 border-white rounded-full"></div>
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 text-sm md:text-base truncate">{partner.name}</h2>
              <p className="text-xs text-gray-500 truncate hidden sm:block">{conversation.jobId.title}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 md:space-x-2">
            <button 
              onClick={() => startCall('voice')}
              className="p-1.5 md:p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              title="Voice Call"
            >
              <Phone className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button 
              onClick={() => startCall('video')}
              className="p-1.5 md:p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all hidden sm:flex"
              title="Video Call"
            >
              <Video className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button 
              onClick={() => startCall('screen')}
              className="p-1.5 md:p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all hidden md:flex"
              title="Screen Share"
            >
              <Monitor className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => setActiveTab('meetings')}
              className="p-1.5 md:p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all hidden md:flex"
              title="Schedule Meeting"
            >
              <Calendar className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            {isEncryptionReady && (
              <div className="hidden md:flex items-center space-x-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                <Lock className="w-3 h-3" />
                <span>Encrypted</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-3 md:py-4 bg-white min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Shield className="w-12 h-12 md:w-16 md:h-16 mb-4 opacity-50" />
              <p className="text-base md:text-lg font-medium">No messages yet</p>
              <p className="text-xs md:text-sm">Start a secure conversation</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {messages.map((message, index) => {
                const isOwnMessage = message.senderId === currentUserId;
                const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
                
                return (
                  <div key={message.messageId || index} className="flex items-start space-x-2 md:space-x-3">
                    {showAvatar ? (
                      <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                        {isOwnMessage ? (
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm md:text-base">
                            {currentUserId[0]?.toUpperCase()}
                          </div>
                        ) : (
                          partner.profileImage ? (
                            <img src={partner.profileImage} alt={partner.name} className="w-8 h-8 md:w-10 md:h-10 rounded" />
                          ) : (
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500 rounded flex items-center justify-center text-white font-bold text-sm md:text-base">
                              {partner.name[0].toUpperCase()}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0"></div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline space-x-2 mb-1">
                          <span className="font-bold text-gray-900">{isOwnMessage ? 'You' : partner.name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-gray-900 text-sm leading-relaxed">
                        {message.messageType === 'file' ? (
                          <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg max-w-sm">
                            <File className="w-8 h-8 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{message.fileName || message.content}</p>
                              <p className="text-xs text-gray-500">{(message.fileSize / 1024).toFixed(1)} KB</p>
                            </div>
                            <button className="p-1.5 hover:bg-gray-200 rounded">
                              <Download className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        ) : message.messageType === 'image' ? (
                          <div className="max-w-sm">
                            <img src={message.fileUrl} alt="Shared image" className="rounded-lg" />
                          </div>
                        ) : (
                          <p className="break-words">{message.content}</p>
                        )}
                        
                        {isOwnMessage && (
                          <div className="mt-1 flex items-center space-x-1">
                            {(!message.status || message.status === 'sent') && (
                              <Check className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
                            )}
                            {message.status === 'delivered' && (
                              <CheckCheck className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
                            )}
                            {(message.status === 'read' || message.isRead) && (
                              <CheckCheck className="w-3 h-3 text-blue-500" strokeWidth={2.5} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 px-3 md:px-6 py-3 md:py-4 bg-white flex-shrink-0">
          <div className="flex items-end space-x-1 md:space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 md:p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 md:p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0 hidden sm:flex"
              title="Add emoji"
            >
              <Smile className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <div className="flex-1 relative min-w-0">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Message ${partner.name}...`}
                rows={1}
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className={`p-3 rounded-lg transition-all ${
                newMessage.trim()
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-3 rounded-lg transition-all ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title="Voice message"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
          
          {isEncryptionReady && (
            <div className="flex items-center justify-center mt-2 text-xs text-gray-500">
              <Lock className="w-3 h-3 mr-1" />
              <span>Messages are end-to-end encrypted</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecureChat;
