// index.js - บอท Discord.js v14 | Anti-spam + Verify System
// ต้องการ: discord.js ^14, dotenv
// ไฟล์ .env: TOKEN, ROLE_ID, DEBUG (optional)

'use strict';
require('dotenv').config();

const {
    Client,
    Events,
    GatewayIntentBits,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

// ====================================================
// การตั้งค่าระบบ
// ====================================================
const CONFIG = Object.freeze({
    TOKEN:             process.env.TOKEN,
    ROLE_ID:           process.env.ROLE_ID,

    // Anti-spam
    WARN_THRESHOLD:    parseInt(process.env.WARN_THRESHOLD  ?? '5',  10), // ข้อความ/วินาที → เตือน
    MUTE_THRESHOLD:    parseInt(process.env.MUTE_THRESHOLD  ?? '10', 10), // ข้อความ/วินาที → timeout
    WINDOW_MS:         parseInt(process.env.WINDOW_MS       ?? '5000', 10),
    WARN_COOLDOWN_MS:  parseInt(process.env.WARN_COOLDOWN   ?? '5000', 10),
    TIMEOUT_DURATION:  parseInt(process.env.TIMEOUT_DURATION ?? String(10 * 60 * 1000), 10), // ms

    // ช่องหรือยศที่ข้ามการตรวจสอบสแปม (เพิ่ม ID เป็น string)
    IGNORE_CHANNELS:   (process.env.IGNORE_CHANNELS ?? '').split(',').filter(Boolean),
    IGNORE_ROLES:      (process.env.IGNORE_ROLES    ?? '').split(',').filter(Boolean),

    DEBUG:             process.env.DEBUG === 'true',
});

// ตรวจสอบ config ที่จำเป็น
if (!CONFIG.TOKEN || !CONFIG.ROLE_ID) {
    console.error('[FATAL] ไม่พบ TOKEN หรือ ROLE_ID ใน .env — หยุดการทำงาน');
    process.exit(1);
}

// ====================================================
// สร้าง Client
// ====================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ====================================================
// โครงสร้างข้อมูลสแปมต่อผู้ใช้
// ====================================================
/**
 * @typedef {Object} SpamEntry
 * @property {number[]} times        - เวลาที่ส่งข้อความ (epoch ms)
 * @property {string|null} lastContent - เนื้อหาข้อความล่าสุด
 * @property {boolean} warned        - กำลังอยู่ในช่วง cooldown เตือน
 * @property {boolean} timedOut      - เพิ่งถูก timeout ไปแล้ว (ป้องกันซ้ำ)
 */

/** @type {Map<string, SpamEntry>} */
const spamMap = new Map();

/** ดึงหรือสร้าง SpamEntry ของผู้ใช้ */
function getSpamEntry(userId) {
    if (!spamMap.has(userId)) {
        spamMap.set(userId, {
            times:       [],
            lastContent: null,
            warned:      false,
            timedOut:    false,
        });
    }
    return spamMap.get(userId);
}

/** ล้างข้อมูลสแปมของผู้ใช้ */
function clearSpamEntry(userId) {
    spamMap.delete(userId);
}

// ====================================================
// Helper
// ====================================================
function log(label, ...args) {
    if (CONFIG.DEBUG) console.log(`[${label}]`, ...args);
}

/** ลองลบข้อความ — ไม่ throw ถ้าไม่มีสิทธิ์หรือลบไปแล้ว */
async function tryDelete(message) {
    try {
        if (message.deletable) await message.delete();
    } catch (err) {
        log('AntiSpam', `ลบข้อความไม่สำเร็จ (${err.code ?? err.message})`);
    }
}

/** ลองส่งข้อความในช่อง — ไม่ throw ถ้าไม่มีสิทธิ์ */
async function trySend(channel, content) {
    try {
        await channel.send(content);
    } catch (err) {
        log('AntiSpam', `ส่งข้อความไม่สำเร็จ (${err.code ?? err.message})`);
    }
}

// ====================================================
// ตรวจสอบว่าควรข้ามการตรวจสอบสแปมหรือไม่
// ====================================================
/**
 * @param {import('discord.js').Message} message
 * @returns {boolean} true = ข้ามการตรวจสอบ
 */
function shouldIgnoreSpam(message) {
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        log('AntiSpam', `ข้าม Admin: ${message.author.tag}`);
        return true;
    }
    if (CONFIG.IGNORE_CHANNELS.includes(message.channel.id)) {
        log('AntiSpam', `ข้ามช่อง: ${message.channel.id}`);
        return true;
    }
    if (CONFIG.IGNORE_ROLES.length && message.member.roles.cache.some(r => CONFIG.IGNORE_ROLES.includes(r.id))) {
        log('AntiSpam', `ข้ามยศ: ${message.author.tag}`);
        return true;
    }
    return false;
}

// ====================================================
// ระบบ Anti-spam
// ====================================================
/**
 * @param {import('discord.js').Message} message
 */
async function handleAntiSpam(message) {
    const userId = message.author.id;
    const now    = Date.now();
    const entry  = getSpamEntry(userId);

    // ถ้ากำลังถูก timeout อยู่ ลบข้อความแล้วออก
    if (entry.timedOut) {
        await tryDelete(message);
        return;
    }

    // อัปเดตรายการเวลา (เฉพาะช่วง WINDOW_MS)
    entry.times.push(now);
    entry.times = entry.times.filter(t => now - t < CONFIG.WINDOW_MS);

    const count       = entry.times.length;
const currentContent = message.content
    .toLowerCase()
    .trim();

const lastContent = entry.lastContent
    ? entry.lastContent.toLowerCase().trim()
    : null;

const isDuplicate =
    lastContent !== null &&
    lastContent === currentContent &&
    currentContent.length > 0;

entry.lastContent = message.content;
    entry.lastContent = message.content;

    log('AntiSpam', `${message.author.tag}: ${count} msgs | duplicate=${isDuplicate}`);

    const isSpam = count >= CONFIG.WARN_THRESHOLD || isDuplicate;

    // ---- ลบข้อความและเตือน ----
    if (isSpam) {
        await tryDelete(message);

        if (!entry.warned) {
            entry.warned = true;
            await trySend(
                message.channel,
                `⚠️ ${message.author} กรุณาหยุดส่งข้อความซ้ำหรือส่งเร็วเกินไป`,
            );
            setTimeout(() => { entry.warned = false; }, CONFIG.WARN_COOLDOWN_MS);
        }
    }

    // ---- Timeout ----
    if (count >= CONFIG.MUTE_THRESHOLD && !entry.timedOut) {
        entry.timedOut = true;

        try {
            await message.member.timeout(CONFIG.TIMEOUT_DURATION, 'Anti-spam: ส่งข้อความเร็วเกินไป');
            await trySend(
                message.channel,
                `🚫 ${message.author} ถูก Timeout ${Math.round(CONFIG.TIMEOUT_DURATION / 60_000)} นาที เนื่องจากสแปมข้อความ`,
            );
            log('AntiSpam', `Timeout: ${message.author.tag}`);
        } catch (err) {
            console.error('[AntiSpam] Timeout ไม่สำเร็จ:', err);
        } finally {
            // ล้างข้อมูลหลัง timeout หมด
            setTimeout(() => clearSpamEntry(userId), CONFIG.TIMEOUT_DURATION);
        }
    }
}

// ====================================================
// Event Handlers
// ====================================================
client.once(Events.ClientReady, () => {
    console.log(`✅ ออนไลน์: ${client.user.tag} (${client.user.id})`);
    console.log(`   Anti-spam: เตือน=${CONFIG.WARN_THRESHOLD} | Timeout=${CONFIG.MUTE_THRESHOLD} ข้อความ/${CONFIG.WINDOW_MS}ms`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.guild)     return;

    // --- คำสั่ง Verify ---
    const content = message.content.trim();
    if (content === '!verify' || content === 'ยืนยันตัวตน') {
        await handleVerifyCommand(message);
        return;
    }

    // --- Anti-spam ---
    if (shouldIgnoreSpam(message)) return;
    await handleAntiSpam(message);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'verify') return;
    await handleVerifyInteraction(interaction);
});

// ====================================================
// คำสั่ง !verify
// ====================================================
/** @param {import('discord.js').Message} message */
async function handleVerifyCommand(message) {
    const role = message.guild.roles.cache.get(CONFIG.ROLE_ID);
    if (!role) {
        await message.reply('❌ ไม่พบยศที่กำหนดไว้ในเซิร์ฟเวอร์ กรุณาติดต่อผู้ดูแล');
        return;
    }

    // ถ้ามียศแล้ว ตอบ ephemeral-like ด้วย reply ชั่วคราว
    if (message.member.roles.cache.has(CONFIG.ROLE_ID)) {
        const reply = await message.reply('ℹ️ คุณได้รับยศนี้แล้ว');
        setTimeout(() => reply.delete().catch(() => {}), 5_000);
        return;
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('verify')
            .setLabel('✅ รับยศแฮกเกอร์ฝึกหัด')
            .setStyle(ButtonStyle.Success),
    );

    await message.channel.send({
        content: `${message.author} กดปุ่มด้านล่างเพื่อยืนยันตัวตนและรับยศ`,
        components: [row],
    });
}

// ====================================================
// Interaction: กดปุ่ม Verify
// ====================================================
/** @param {import('discord.js').ButtonInteraction} interaction */
async function handleVerifyInteraction(interaction) {
    // defer ทันทีเพื่อป้องกัน timeout ของ interaction
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.guild.roles.cache.get(CONFIG.ROLE_ID);
    if (!role) {
        await interaction.editReply('❌ ไม่พบยศที่กำหนด กรุณาติดต่อผู้ดูแลเซิร์ฟเวอร์');
        return;
    }

    if (interaction.member.roles.cache.has(CONFIG.ROLE_ID)) {
        await interaction.editReply('ℹ️ คุณได้รับยศนี้แล้ว');
        return;
    }

    try {
        await interaction.member.roles.add(role, 'Verify: ผู้ใช้กดยืนยันตัวตน');
        await interaction.editReply('✅ รับยศสำเร็จ ยินดีต้อนรับเข้าสู่เซิร์ฟเวอร์!');
        log('Verify', `มอบยศให้ ${interaction.user.tag}`);
    } catch (err) {
        console.error('[Verify] มอบยศไม่สำเร็จ:', err);
        await interaction.editReply(
            '❌ ไม่สามารถมอบยศได้\n' +
            'โปรดตรวจสอบ:\n' +
            '• ยศของบอทต้องสูงกว่ายศที่จะมอบ\n' +
            '• บอทต้องมีสิทธิ์ Manage Roles',
        );
    }
}

// ====================================================
// Global Error Handling
// ====================================================
client.on('error', (err) => console.error('[Client Error]', err));
client.on('warn',  (msg) => console.warn('[Client Warn]', msg));

process.on('unhandledRejection', (reason) => {
    console.error('[UnhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[UncaughtException]', err);
    process.exit(1);
});

// ====================================================
// เชื่อมต่อ
// ====================================================
client.login(CONFIG.TOKEN);