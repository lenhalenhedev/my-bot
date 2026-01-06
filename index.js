import { createBot } from 'mineflayer';
import { createLogger, format, transports } from 'winston';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


// that a confuck
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'HH:mm:ss' }),
        format.printf(info => {
            let emoji = '🤖';
            if (info.level.toUpperCase() === 'INFO') emoji = '✅';
            if (info.level.toUpperCase() === 'WARN') emoji = '⚠️';
            if (info.level.toUpperCase() === 'ERROR') emoji = '❌';
            return `[${info.timestamp}] ${emoji} ${info.message}`;
        })
    ),
    transports: [
        new transports.Console({
            format: format.combine(format.colorize(), format.printf(info => info.message))
        }),
    ]
});

// 2. LOAD CONFUCK
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, 'config.json');
let config;

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    logger.info('Đã tải cấu hình config.json');
} catch (error) {
    logger.error(`Lỗi đọc Config: ${error.message}`);
    process.exit(1);
}

// 3. FUCKBOT
let bot;
let reconnectTimeout = null;
let reconnectDelay = config.features.autoReconnect.delay || 10000;
let afkIntervalHandle = null;

// support shit

function getUsername() {
    let name = config.bot.baseUsername;
    if (config.features.randomUsernameOnKick?.enabled) {
        name += Math.floor(Math.random() * 1000).toString();
    }
    return name;
}

function lookAtNearestEntity() {
    if (!bot || !bot.entity) return false;
    const entity = bot.nearestEntity((e) => (e.type === 'player' && e.username !== bot.username) || e.type === 'mob');
    if (entity) {
        const pos = entity.position.offset(0, entity.height, 0);
        bot.lookAt(pos, true);
        return true;
    }
    return false;
}

function randomSafeWalk() {
    if (!bot || !bot.entity) return;
    bot.setControlState('sneak', true); // Giữ Shift để không ngã
    const directions = ['forward', 'back', 'left', 'right'];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    
    bot.setControlState(randomDir, true);
    
    // Random time shit
    const walkTime = 500 + Math.random() * 800;
    
    setTimeout(() => {
        if (bot) {
            bot.setControlState(randomDir, false);
            setTimeout(() => { if(bot) bot.setControlState('sneak', false); }, 300);
        }
    }, walkTime);
}

function startSmartAntiAfk() {
    if (!config.features.smartAntiAfk.enabled) return;
    if (afkIntervalHandle) clearTimeout(afkIntervalHandle);

    const actions = config.features.smartAntiAfk.actions;
    
    const executeAction = () => {
        if (!bot || !bot.entity) return;
        const rand = Math.random();

        
        if (actions.rotateToEntity && rand < 0.25) {
            if (!lookAtNearestEntity()) {
                // Quay đầu ngẫu nhiên nếu không có ai
                bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI, true);
            }
        } else if (actions.walkSafe && rand < 0.5) {
            randomSafeWalk();
        } else if (actions.switchHotbar && rand < 0.7) {
            bot.setQuickBarSlot(Math.floor(Math.random() * 9));
        } else if (actions.jump && rand < 0.8) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        } else {
            if (actions.swingArm && Math.random() > 0.5) bot.swingArm();
            else if (actions.sneak) {
                bot.setControlState('sneak', true);
                setTimeout(() => bot.setControlState('sneak', false), 800);
            }
        }
    };

    
    const nextTime = Math.floor(Math.random() * (config.features.smartAntiAfk.maxInterval - config.features.smartAntiAfk.minInterval) + config.features.smartAntiAfk.minInterval);
    
    afkIntervalHandle = setTimeout(() => {
        executeAction();
        startSmartAntiAfk();
    }, nextTime);
}

function startAutoChat() {
    if (!config.features.autoChat.enabled) return;
    
    
    const chatInterval = setInterval(() => {
        if (bot && bot.entity) {
            const msgs = config.features.autoChat.messages;
            let msg = msgs[Math.floor(Math.random() * msgs.length)];
            if (config.features.autoChat.addRandomSuffix) msg += ` [${Math.floor(Math.random()*100)}]`;
            bot.chat(msg);
        } else {
            clearInterval(chatInterval);
        }
    }, config.features.autoChat.interval);
}

// =================================================================================================
// 5. MAIN BOT & FUCK BOT & BY CHAT GPT & GROK & DEEP SEEK & AND MORE🤑
// =================================================================================================
function createMinecraftBot() {
    const username = getUsername();
    
    logger.info(`🚀 Đang kết nối tới ${config.server.host}:${config.server.port} | User: ${username}`);

    bot = createBot({
        host: config.server.host,
        port: config.server.port,
        username: username,
        password: config.bot.password || undefined,
        auth: config.server.auth,
        version: config.server.version, // Nên để false để auto detect
        hideErrors: true
    });

    // --- FIX CRITICAL: RESOURCE PACK BYPASS (THEO BÁO CÁO) ---
    // Can thiệp trực tiếp vào client để xử lý gói tin 1.20.3+
    
    // 1. Xử lý gói tin chuẩn mới (có UUID)
    bot._client.on('add_resource_pack', (data) => {
        if (config.features.autoAcceptResourcePack.enabled) {
            logger.info(`📦 Phát hiện Resource Pack (UUID: ${data.uuid}) -> Đang Bypass...`);
            // Gửi Accepted (3)
            bot._client.write('resource_pack_receive', { uuid: data.uuid, result: 3 });
            // Gửi Successfully Loaded (0) ngay lập tức để lừa server
            bot._client.write('resource_pack_receive', { uuid: data.uuid, result: 0 });
        }
    });

    // 2. Xử lý gói tin chuẩn cũ (dùng Hash) - Dự phòng
    bot._client.on('resource_pack_send', (data) => {
        if (config.features.autoAcceptResourcePack.enabled) {
            logger.info(`📦 Phát hiện Resource Pack (Hash) -> Đang Bypass...`);
            bot._client.write('resource_pack_receive', { hash: data.hash, result: 3 });
            bot._client.write('resource_pack_receive', { hash: data.hash, result: 0 });
        }
    });

    // ---------------- SỰ KIỆN ----------------

    bot.on('spawn', () => {
        logger.info('✅ Bot đã vào server! Kích hoạt Smart AFK.');
        reconnectDelay = config.features.autoReconnect.delay;
        startSmartAntiAfk();
        startAutoChat();
    });

    // Auto Login
    bot.on('messagestr', (msg) => {
        const m = msg.toLowerCase();
        if (!config.bot.password) return;

        // Detect Queue của Aternos
        if (m.includes('waiting in queue') || m.includes('position in queue')) {
            logger.warn('⏳ Đang trong hàng chờ Aternos... Giữ kết nối.');
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 1000);
            return;
        }

        if (m.includes('/login') || m.includes('nhập mật khẩu') || m.includes('đăng nhập')) {
            logger.info('🔑 Đang đăng nhập...');
            bot.chat(`/login ${config.bot.password}`);
        }
        else if (m.includes('/register') || m.includes('đăng ký')) {
            logger.info('📝 Đang đăng ký...');
            bot.chat(`/register ${config.bot.password} ${config.bot.password}`);
        }
    });

    bot.on('death', () => {
        logger.warn('💀 Bot đã chết. Đang hồi sinh...');
        if (config.features.autoRespawn.enabled) {
            setTimeout(() => bot.respawn(), 2000);
        }
    });

    bot.on('windowOpen', (win) => {
        if (config.features.autoCloseWindows.enabled) {
            setTimeout(() => {
                bot.closeWindow(win);
                logger.info('🪟 Đã đóng cửa sổ popup.');
            }, 1000);
        }
    });

    bot.on('kicked', (reason) => {
        logger.warn(`🚪 Bot bị kick: ${reason}`);
        // Nếu bị throttle (spam connect), tăng thời gian chờ
        if (JSON.stringify(reason).includes("throttle")) reconnectDelay = 30000;
    });

    bot.on('end', (reason) => {
        logger.warn(`🔌 Ngắt kết nối: ${reason}`);
        cleanupAndReconnect();
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
            logger.error(`❌ Server đang TẮT hoặc sai IP.`);
        } else if (err.code === 'ECONNRESET') {
             logger.error(`❌ Mất kết nối đột ngột.`);
        } else {
            logger.error(`🐛 Lỗi: ${err.message}`);
        }
    });
}

// --- HÀM DỌN DẸP & RECONNECT AN TOÀN (FIX MEMORY LEAK) ---
function cleanupAndReconnect() {
    if (reconnectTimeout) return;
    
    // Dọn dẹp bot cũ
    if (bot) {
        bot.removeAllListeners();
        bot = null; 
    }
    if (afkIntervalHandle) clearTimeout(afkIntervalHandle);

    const maxDelay = config.features.autoReconnect.maxDelay || 120000;
    logger.warn(`🔄 Thử lại sau ${reconnectDelay / 1000} giây...`);
    
    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        createMinecraftBot();
        reconnectDelay = Math.min(reconnectDelay * 1.5, maxDelay); 
    }, reconnectDelay);
}

createMinecraftBot();

// Bắt lỗi toàn cục để tránh crash app
process.on('uncaughtException', (err) => { logger.error(`UNCAUGHT: ${err.message}`); }); 
process.on('unhandledRejection', (reason) => { logger.error(`UNHANDLED: ${reason}`); });