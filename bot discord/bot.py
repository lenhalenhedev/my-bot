import discord
from discord.ext import commands
import time
import platform
import psutil
import os
from mcstatus import JavaServer
import asyncio
from datetime import datetime

intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)

# <<< CONFIG MINECRAFT SERVER <<<
MC_SERVER_IP = "IP"          # IP & domain
MC_CHANNEL_ID = 1456573401878495353         # ID CHANNEL DC
CHECK_INTERVAL = 300                         # Check 300s
# >>>

previous_status = None  # True: online, False: offline, None: chưa biết

async def minecraft_monitor():
    global previous_status
    await bot.wait_until_ready()
    
    channel = bot.get_channel(MC_CHANNEL_ID)
    if not channel:
        print(f"[ERROR] Không tìm thấy channel ID: {MC_CHANNEL_ID}")
        return

    print(f"[MC Monitor] Đang theo dõi {MC_SERVER_IP} mỗi {CHECK_INTERVAL}s (chỉ dùng Status)")

    while not bot.is_closed():
        current_online = False
        embed = None

        try:
            server = JavaServer.lookup(MC_SERVER_IP)
            status = server.status()  # Chỉ dùng status() - nhẹ và luôn hoạt động
            current_online = True

            players = f"{status.players.online}/{status.players.max}"
            latency = round(status.latency)
            motd = status.description
            if isinstance(motd, dict):
                motd = motd.get('text', 'SKY SMP')
            motd_str = str(motd).replace('\n', ' ')[:500]

            # Detect Paper từ version (vì host chặn query)
            version = status.version.name
            software = "Paper" if "Paper" in version else "Vanilla/Spigot"

            embed = discord.Embed(
                title="🟢 Minecraft Server Online!",
                description=f"**{MC_SERVER_IP}** đã online trở lại!",
                color=0x00ff00,
                timestamp=datetime.utcnow()
            )
            embed.add_field(name="Players", value=players, inline=True)
            embed.add_field(name="Latency", value=f"{latency}ms", inline=True)
            embed.add_field(name="Software", value=software, inline=True)
            embed.add_field(name="Version", value=version, inline=True)
            embed.add_field(name="MOTD", value=motd_str or "SKY SMP", inline=False)

        except Exception as e:
            current_online = False
            embed = discord.Embed(
                title="🔴 Minecraft Server Offline!",
                description=f"**{MC_SERVER_IP}** không phản hồi!",
                color=0xff0000,
                timestamp=datetime.utcnow()
            )

        # Chỉ gửi khi status thay đổi
        if previous_status != current_online:
            await channel.send(embed=embed)
            previous_status = current_online
            print(f"[MC Status] {'Online' if current_online else 'Offline'} → Đã gửi thông báo")

        await asyncio.sleep(CHECK_INTERVAL)

@bot.event
async def on_ready():
    print(f"Bot đã sẵn sàng! Đăng nhập với tên: {bot.user}")
    asyncio.create_task(minecraft_monitor())

@bot.command(name="ping")
async def ping(ctx):
    start_time = time.time()
    msg = await ctx.send("🏓 Đang tính ping...")
    end_time = time.time()
    api_latency = round((end_time - start_time) * 1000)
    ws_latency = round(bot.latency * 1000)

    cpu_usage = psutil.cpu_percent(interval=1)
    ram = psutil.virtual_memory()
    ram_total = round(ram.total / (1024**3), 2)
    ram_used = round(ram.used / (1024**3), 2)
    ram_usage = ram.percent

    uptime = time.time() - psutil.boot_time()
    uptime_str = f"{int(uptime // 86400)} ngày, {int((uptime % 86400) // 3600)} giờ"

    os_info = f"{platform.system()} {platform.release()}"

    embed = discord.Embed(title="🏓 Pong!", color=0x00ff00)
    embed.add_field(name="Websocket Latency", value=f"{ws_latency}ms", inline=True)
    embed.add_field(name="API Latency (Delay)", value=f"{api_latency}ms", inline=True)
    embed.add_field(name="\u200b", value="\u200b", inline=True)
    embed.add_field(name="Server Info (VPS)", value=(
        f"**OS:** {os_info}\n"
        f"**CPU Usage:** {cpu_usage}%\n"
        f"**RAM:** {ram_used}GB / {ram_total}GB ({ram_usage}%)\n"
        f"**Uptime:** {uptime_str}"
    ), inline=False)

    await msg.edit(content=None, embed=embed)

@bot.command(name="mcstatus")
async def mcstatus(ctx):
    try:
        server = JavaServer.lookup(MC_SERVER_IP)
        status = server.status()

        players = f"{status.players.online}/{status.players.max}"
        latency = round(status.latency)
        version = status.version.name
        software = "Paper" if "Paper" in version else "Vanilla/Spigot"

        motd = status.description
        if isinstance(motd, dict):
            motd = motd.get('text', 'SKY SMP')
        motd_str = str(motd).replace('\n', ' ')[:500]

        embed = discord.Embed(title="🟢 Server Online", color=0x00ff00)
        embed.add_field(name="Players", value=players, inline=True)
        embed.add_field(name="Latency", value=f"{latency}ms", inline=True)
        embed.add_field(name="Software", value=software, inline=True)
        embed.add_field(name="Version", value=version, inline=True)
        embed.add_field(name="MOTD", value=motd_str or "SKY SMP", inline=False)
        await ctx.send(embed=embed)
    
    except:
        await ctx.send(embed=discord.Embed(title="🔴 Server Offline", color=0xff0000, description="Không kết nối được!"))

bot.run("token-herr")
