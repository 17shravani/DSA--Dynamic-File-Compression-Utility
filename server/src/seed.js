import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Discussion from './models/Discussion.js';
import Comment from './models/Comment.js';
import Message from './models/Message.js';

// Load Env
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulsenet';

const seedDatabase = async () => {
  try {
    console.log('🔄 Connecting to database for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('💚 Connected to database.');

    // 1. Purge Existing Collections
    console.log('🧹 Purging existing database records...');
    await User.deleteMany({});
    await Discussion.deleteMany({});
    await Comment.deleteMany({});
    await Message.deleteMany({});
    console.log('✨ Database successfully purged.');

    // 2. Create Sample Users
    console.log('👥 Creating mock users...');
    const alice = await User.create({
      username: 'developer_alice',
      email: 'alice@pulsenet.dev',
      password: 'password123',
      role: 'admin',
      bio: 'Principal Software Architect. Passionate about WebSockets, node.js clustering, and scalable distributed database topologies.',
    });

    const bob = await User.create({
      username: 'coder_bob',
      email: 'bob@pulsenet.dev',
      password: 'password123',
      role: 'user',
      bio: 'Frontend Engineer. Coding in React, experimenting with Framer Motion transitions, and crafting responsive Tailwind UI dashboards.',
    });

    const charlie = await User.create({
      username: 'moderator_charlie',
      email: 'charlie@pulsenet.dev',
      password: 'password123',
      role: 'moderator',
      bio: 'Platform Moderator. Here to maintain clean community guidelines and support newcomers on dev-talk boards.',
    });

    console.log(`✅ Created 3 users: ${alice.username}, ${bob.username}, ${charlie.username}`);

    // 3. Create Sample Discussions (Forums)
    console.log('📝 Creating forum discussions...');
    const thread1 = await Discussion.create({
      title: 'Best practices for scaling Socket.io rooms with Redis Pub/Sub adapters?',
      content: `Hey team! I am designing a real-time gateway that needs to support upwards of 100,000 concurrent socket connections.

To prevent memory leaks and handle high loads, I am clustering our Node.js gateway nodes behind an Nginx reverse proxy. I know that Socket.io relies on an in-memory adapter by default, which means connections on Node Server A cannot communicate with Server B.

I am planning to use the \`@socket.io/redis-adapter\` to broadcast events across nodes. What are your experiences with Redis CPU load in production when handling massive room broadcast loops? Any buffer configurations or rate-limiting strategies you would recommend?`,
      author: alice._id,
      tags: ['socketio', 'redis', 'architecture', 'node'],
      votes: [
        { user: bob._id, voteType: 'up' },
        { user: charlie._id, voteType: 'up' },
      ],
    });

    const thread2 = await Discussion.create({
      title: 'Why React 18 Concurrent Features and Server Components are a complete game-changer',
      content: `I've been upgrading some older dashboard apps to React 18 and utilizing concurrent rendering.

The UX improvements from \`useTransition\` and \`useDeferredValue\` are incredible. It allows complex filter listings to calculate in the background without freezing the input typing indicators.

Combine that with NextJS App Router server components, and we get near-instant initial loads with practically zero client-side bundles! Would love to hear how other teams are structuring state management with nested folders.`,
      author: bob._id,
      tags: ['react', 'javascript', 'tailwind'],
      votes: [
        { user: alice._id, voteType: 'up' },
      ],
    });

    console.log('✅ Created 2 discussions.');

    // 4. Create Threaded Comments (Nested tree)
    console.log('💬 Creating nested comments...');
    // Bob comments on Alice's socket thread
    const comment1 = await Comment.create({
      content: `Excellent topic, Alice! I dealt with this during a recent platform launch.

We scaled to 50k concurrent sockets using AWS ElastiCache Redis. One key recommendation is to ensure you monitor your Redis replication lag. Also, definitely configure a rate-limiter on client emitters before they broadcast to busy rooms.`,
      discussion: thread1._id,
      author: bob._id,
      votes: [{ user: alice._id, voteType: 'up' }],
    });

    // Alice replies directly to Bob (Nested comment)
    const comment2 = await Comment.create({
      content: `Thanks for the insights, Bob! 

Did you notice any major latency spikes when scaling connection groups on AWS ElastiCache? Also, did you deploy Redis in a clustered configuration or was a single primary node sufficient?`,
      discussion: thread1._id,
      author: alice._id,
      parentId: comment1._id, // References Bob's comment!
    });

    // Charlie posts a separate general comment
    await Comment.create({
      content: 'This thread is an absolute goldmine. Pinning this to the sidebar for newcomers.',
      discussion: thread1._id,
      author: charlie._id,
    });

    // Update comment counts on Discussion documents
    thread1.commentCount = 3;
    await thread1.save();

    thread2.commentCount = 0;
    await thread2.save();

    console.log('✅ Created 3 comments.');

    // 5. Create Historical Messages in Workspace Chat
    console.log('📡 Creating real-time message history...');
    await Message.create([
      {
        channel: '#general',
        sender: charlie._id,
        text: 'Welcome to the PulseNet real-time chat workspace! This channel is for general tech chit-chat.',
      },
      {
        channel: '#general',
        sender: alice._id,
        text: "Hey everyone! Exciting to have this real-time engine running alongside our discussion boards.",
      },
      {
        channel: '#general',
        sender: bob._id,
        text: 'Socket.io connections are lightning fast on this local workspace! WebSockets are amazing.',
      },
      {
        channel: '#dev-talk',
        sender: alice._id,
        text: 'Working on a new architectural draft for microservice routing. Will share it soon.',
      },
    ]);

    console.log('✅ Created sample message logs.');
    console.log('🎉 Seeding successfully completed! Database is ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seedDatabase();
