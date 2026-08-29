const express = require('express');
const cors = require('cors');
const app = express();
const SECRET_TOKEN = "RAHASIA_RF_123"; 

app.use(cors());
app.use(express.json());

const botDatabase = {};

// Master List Item Adopt Me Resmi (Full Manual, Sesuai Script Game)
const MASTER_ADOPT_ME_ITEMS = [
    "Crystal Egg", "Cracked Egg", "Pet Egg", "Royal Egg", "Aussie Egg", "Fossil Egg", 
    "Mythic Egg", "Southeast Asia Egg", "Urban Egg", "Desert Egg", "Japan Egg", "Danger Egg",
    "Alicorn", "Ancient Dragon", "Shadow Dragon", "Bat Dragon", "Frost Dragon", "Giraffe", 
    "Owl", "Parrot", "Evil Unicorn", "Crow", "Arctic Reindeer", "Turtle", "Kangaroo", 
    "Albino Monkey", "Queen Bee", "Diamond Unicorn", "Golden Dragon", "Cerberus", "Kitsune", 
    "Griffin", "Dragon", "Unicorn", "Dog", "Cat", "Buffalo", "Otter", "2D Kitty",
    "Ride Potion", "Fly Potion", "Small Age Potion", "Age Up Potion", "Water Walk Potion", 
    "Golden Apple", "Cotton Candy", "Hot Dog", "Pizza", "Coffee", "Tealwood Monster Bait",
    "Rat Box", "Boba Car", "Bathtub", "Cloud Stroller", "Telescope Pogo"
];

function cleanItemName(rawName) {
    if (!rawName) return "Unknown";
    let name = rawName.toLowerCase();
    name = name.replace(/^(basic_egg_|pet_shop_|royal_egg_|cracked_egg_|event_|crate_)/g, '');
    name = name.replace(/(_2025|_2024|_2023|_box|_pet)/g, '');
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

app.post('/api/telemetry', (req, res) => {
    if (req.headers['authorization'] !== SECRET_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

    const { username, rf_location, status, bucks, inventory, autotrade_status } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    if (!botDatabase[username]) {
        botDatabase[username] = { pendingCommands: [] };
    }

    let summaryInventory = {};
    let crystalEggCount = 0;
    let flatInventory = [];

    if (inventory) {
        if (Array.isArray(inventory)) {
            flatInventory = inventory;
        } else if (typeof inventory === 'object') {
            for (let category in inventory) {
                if (typeof inventory[category] === 'object' && inventory[category] !== null) {
                    for (let id in inventory[category]) {
                        let itemObj = inventory[category][id];
                        flatInventory.push({
                            id: id,
                            name: itemObj.kind || itemObj.name || category,
                            type: category.toUpperCase()
                        });
                    }
                }
            }
        }
    }

    flatInventory.forEach(item => {
        if (!item.name) return;
        const cleaned = cleanItemName(item.name);
        
        if (cleaned.toLowerCase().includes('crystal') && cleaned.toLowerCase().includes('egg')) {
            crystalEggCount++;
        }

        if (!summaryInventory[cleaned]) {
            summaryInventory[cleaned] = { name: cleaned, count: 0, type: item.type || 'Item' };
        }
        summaryInventory[cleaned].count++;
    });

    botDatabase[username] = {
        ...botDatabase[username],
        rf_location: rf_location || 'Unknown',
        status: status || 'ONLINE',
        bucks: bucks || 0,
        crystalEggCount: crystalEggCount,
        inventory: flatInventory,
        groupedInventory: Object.values(summaryInventory),
        autotrade_status: autotrade_status ?? false,
        lastHeartbeat: Date.now()
    };

    const command = botDatabase[username].pendingCommands.shift() || null;
    return res.json({ success: true, command: command });
});

app.post('/api/command/config', (req, res) => {
    const { bot_username, autotrade, item_target, receiver } = req.body;
    
    if (botDatabase[bot_username]) {
        botDatabase[bot_username].pendingCommands.push({
            type: "UPDATE_CONFIG",
            autotrade: autotrade,
            item_target: item_target,
            receiver: receiver
        });
        botDatabase[bot_username].autotrade_status = autotrade;
        return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Bot tidak ditemukan' });
});

app.get('/api/dashboard/data', (req, res) => {
    const botsList = Object.keys(botDatabase).map(user => ({
        username: user,
        ...botDatabase[user],
        lastUpdatedFormatted: new Date(botDatabase[user].lastHeartbeat).toLocaleTimeString('id-ID')
    }));

    const totalBucks = botsList.reduce((acc, bot) => acc + bot.bucks, 0);
    const totalCrystalEggs = botsList.reduce((acc, bot) => acc + (bot.crystalEggCount || 0), 0);
    
    res.json({ bots: botsList, totalBucks, totalCrystalEggs, totalBots: botsList.length });
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <title>Adopt Me - Pro Control Panel</title>
        <style>
            body { font-family: Arial, sans-serif; background: #0f172a; color: white; padding: 20px; }
            .card-container { display: flex; gap: 20px; margin-bottom: 20px; }
            .card { background: #1e293b; padding: 20px; border-radius: 10px; flex: 1; border: 1px solid #334155; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 12px; border-bottom: 1px solid #334155; text-align: left; }
            th { background: #0f172a; color: #38bdf8; }
            .btn { background: #2563eb; color: white; padding: 6px 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
            .btn:hover { background: #1d4ed8; }
            .btn-on { background: #16a34a; }
            .btn-off { background: #dc2626; }
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999; }
            .modal-content { background: #1e293b; width: 500px; max-height: 85vh; overflow-y: auto; margin: 50px auto; padding: 20px; border-radius: 10px; border: 1px solid #38bdf8; }
            input, select { background: #0f172a; border: 1px solid #334155; color: white; padding: 8px; width: 100%; border-radius: 5px; margin-top: 5px; margin-bottom: 15px; box-sizing: border-box; }
            
            /* Styling Chip Item Terpilih */
            .selected-items-box { display: flex; flex-wrap: wrap; gap: 6px; background: #0f172a; padding: 8px; border-radius: 5px; border: 1px solid #334155; min-height: 40px; margin-bottom: 10px; }
            .item-chip { background: #2563eb; color: white; padding: 4px 10px; border-radius: 15px; font-size: 12px; display: flex; align-items: center; gap: 6px; }
            .item-chip span { cursor: pointer; font-weight: bold; color: #f87171; }
            
            /* Styling Dropdown Hasil Pencarian Master List */
            .dropdown-list { max-height: 150px; overflow-y: auto; background: #0f172a; border: 1px solid #334155; border-radius: 5px; margin-bottom: 15px; display: none; }
            .dropdown-option { padding: 8px 12px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #1e293b; }
            .dropdown-option:hover { background: #1e293b; color: #38bdf8; }
        </style>
    </head>
    <body>
        <h2>🤖 Adopt Me - Ultimate Dashboard</h2>
        
        <div style="margin-bottom: 15px;">
            <button class="btn" onclick="refreshData()" style="background: #0284c7;">🔄 Refresh Data Manual</button>
        </div>

        <div class="card-container">
            <div class="card">
                <h3>Total Pendapatan Bucks</h3>
                <p id="total-bucks" style="font-size: 24px; color: #facc15; font-weight: bold;">0</p>
            </div>
            <div class="card">
                <h3>Total Crystal Egg di Tas Bot</h3>
                <p id="total-eggs" style="font-size: 24px; color: #38bdf8; font-weight: bold;">0</p>
            </div>
        </div>

        <div class="card">
            <h3>Daftar Akun Bot Aktif</h3>
            <table>
                <thead>
                    <tr>
                        <th>RF</th><th>Username</th><th>Status</th><th>Bucks</th><th>Crystal Egg</th><th>Auto-Trade</th><th>Aksi Kontrol</th>
                    </tr>
                </thead>
                <tbody id="bot-table"></tbody>
            </table>
        </div>

        <!-- Modal Pengaturan Trade (Full Manual Master List & Search) -->
        <div id="trade-modal" class="modal">
            <div class="modal-content">
                <h3 id="modal-trade-title">Pengaturan Trade Bot</h3>
                <input type="hidden" id="target-bot-username">
                
                <label><strong>Daftar Item yang Akan Dikirim:</strong></label>
                <div id="selected-chips-container" class="selected-items-box">
                    <span style="color: #94a3b8; font-size: 12px;">Belum ada item dipilih</span>
                </div>

                <label>Cari & Pilih dari Master List Item:</label>
                <input type="text" id="trade-search-input" placeholder="🔍 Ketik nama item (misal: Alicorn, Potion)..." onkeyup="filterMasterItems()" autocomplete="off">
                <div id="trade-dropdown" class="dropdown-list"></div>
                
                <label>Username Penerima (Receiver):</label>
                <input type="text" id="input-receiver" value="Fishstore200">
                
                <label>Status Auto Trade:</label>
                <select id="select-autotrade">
                    <option value="true">Aktif (ON)</option>
                    <option value="false">Mati (OFF)</option>
                </select>

                <button class="btn btn-on" onclick="saveTradeConfig()" style="width: 100%; padding: 10px; margin-top: 10px;">Simpan & Terapkan</button>
                <button class="btn btn-off" onclick="closeTradeModal()" style="width: 100%; padding: 10px; margin-top: 5px;">Batal</button>
            </div>
        </div>

        <!-- Modal Lihat Tas Sesuai Permintaan -->
        <div id="inv-modal" class="modal">
            <div class="modal-content">
                <h3 id="modal-inv-title">Inventory Bot</h3>
                <input type="text" id="inv-search" placeholder="🔍 Cari nama pet atau item..." onkeyup="filterInventory()">
                <table>
                    <thead>
                        <tr><th>Nama Item / Pet</th><th>Jumlah</th><th>Kategori</th></tr>
                    </thead>
                    <tbody id="inv-table-body"></tbody>
                </table>
                <button class="btn btn-off" onclick="closeInvModal()" style="width: 100%; margin-top: 15px;">Tutup</button>
            </div>
        </div>

        <script>
            let globalBotsData = [];
            let activeUsername = "";
            let selectedTradeItems = [];

            const masterItems = [
                "Crystal Egg", "Cracked Egg", "Pet Egg", "Royal Egg", "Aussie Egg", "Fossil Egg", 
                "Mythic Egg", "Southeast Asia Egg", "Urban Egg", "Desert Egg", "Japan Egg", "Danger Egg",
                "Alicorn", "Ancient Dragon", "Shadow Dragon", "Bat Dragon", "Frost Dragon", "Giraffe", 
                "Owl", "Parrot", "Evil Unicorn", "Crow", "Arctic Reindeer", "Turtle", "Kangaroo", 
                "Albino Monkey", "Queen Bee", "Diamond Unicorn", "Golden Dragon", "Cerberus", "Kitsune", 
                "Griffin", "Dragon", "Unicorn", "Dog", "Cat", "Buffalo", "Otter", "2D Kitty",
                "Ride Potion", "Fly Potion", "Small Age Potion", "Age Up Potion", "Water Walk Potion", 
                "Golden Apple", "Cotton Candy", "Hot Dog", "Pizza", "Coffee", "Tealwood Monster Bait",
                "Rat Box", "Boba Car", "Bathtub", "Cloud Stroller", "Telescope Pogo"
            ];

            async function refreshData() {
                try {
                    const res = await fetch('/api/dashboard/data');
                    const data = await res.json();
                    globalBotsData = data.bots;
                    
                    document.getElementById('total-bucks').innerText = data.totalBucks.toLocaleString('id-ID');
                    document.getElementById('total-eggs').innerText = data.totalCrystalEggs.toLocaleString('id-ID');
                    
                    const tbody = document.getElementById('bot-table');
                    tbody.innerHTML = data.bots.map(bot => {
                        const statusColor = bot.status === 'ONLINE' ? '#34d399' : '#f87171';
                        const isTradeActive = bot.autotrade_status;
                        const tradeBtnClass = isTradeActive ? 'btn btn-on' : 'btn btn-off';
                        const tradeBtnText = isTradeActive ? 'ACTIVE (ON)' : 'OFF';

                        return \`<tr>
                            <td>\${bot.rf_location}</td>
                            <td><strong>\${bot.username}</strong></td>
                            <td style="color: \${statusColor};">\${bot.status}</td>
                            <td style="color: #facc15;">\${bot.bucks}</td>
                            <td style="color: #38bdf8; font-weight: bold;">\${bot.crystalEggCount || 0}</td>
                            <td><span class="\${tradeBtnClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 12px;">\${tradeBtnText}</span></td>
                            <td>
                                <button class="btn" onclick="openTradeModalSafe('\${bot.username}', \${isTradeActive})">Atur Trade</button>
                                <button class="btn" style="background: #475569;" onclick="openInventory('\${bot.username}')">Tas</button>
                            </td>
                        </tr>\`;
                    }).join('');
                } catch(e) { console.error(e); }
            }

            function openTradeModalSafe(username, currentStatus) {
                document.getElementById('target-bot-username').value = username;
                document.getElementById('select-autotrade').value = currentStatus.toString();
                document.getElementById('modal-trade-title').innerText = "Trade Config: " + username;
                
                selectedTradeItems = ["Crystal Egg"]; 
                renderSelectedChips();
                document.getElementById('trade-search-input').value = '';
                document.getElementById('trade-dropdown').style.display = 'none';

                document.getElementById('trade-modal').style.display = 'block';
            }

            function renderSelectedChips() {
                const container = document.getElementById('selected-chips-container');
                if (selectedTradeItems.length === 0) {
                    container.innerHTML = '<span style="color: #94a3b8; font-size: 12px;">Belum ada item dipilih</span>';
                    return;
                }
                container.innerHTML = selectedTradeItems.map((item, index) => \`
                    <div class="item-chip">\${item} <span onclick="removeItemChip(\${index})">&times;</span></div>
                \`).join('');
            }

            function addItemChip(itemName) {
                if (!selectedTradeItems.includes(itemName)) {
                    selectedTradeItems.push(itemName);
                    renderSelectedChips();
                }
                document.getElementById('trade-search-input').value = '';
                document.getElementById('trade-dropdown').style.display = 'none';
            }

            function removeItemChip(index) {
                selectedTradeItems.splice(index, 1);
                renderSelectedChips();
            }

            function filterMasterItems() {
                const keyword = document.getElementById('trade-search-input').value.toLowerCase();
                const dropdown = document.getElementById('trade-dropdown');

                if (keyword.trim() === '') {
                    dropdown.style.display = 'none';
                    return;
                }

                const filtered = masterItems.filter(item => item.toLowerCase().includes(keyword));
                if (filtered.length === 0) {
                    dropdown.innerHTML = '<div class="dropdown-option" style="color: #94a3b8;">Item tidak ditemukan di Master List</div>';
                } else {
                    dropdown.innerHTML = filtered.map(item => \`
                        <div class="dropdown-option" onclick="addItemChip('\${item}')">+ \${item}</div>
                    \`).join('');
                }
                dropdown.style.display = 'block';
            }

            function closeTradeModal() {
                document.getElementById('trade-modal').style.display = 'none';
            }

            async function saveTradeConfig() {
                const username = document.getElementById('target-bot-username').value;
                const autotrade = document.getElementById('select-autotrade').value === 'true';
                const receiver = document.getElementById('input-receiver').value;

                const itemTargetString = selectedTradeItems.length > 0 ? selectedTradeItems.join(', ') : 'Crystal Egg';

                await fetch('/api/command/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        bot_username: username, 
                        autotrade: autotrade,
                        item_target: itemTargetString,
                        receiver: receiver
                    })
                });
                closeTradeModal();
                refreshData();
            }

            function openInventory(username) {
                activeUsername = username;
                document.getElementById('inv-search').value = '';
                renderInventoryTable();
                document.getElementById('modal-inv-title').innerText = \`Tas: \${username}\`;
                document.getElementById('inv-modal').style.display = 'block';
            }

            function renderInventoryTable(filterKeyword = '') {
                const bot = globalBotsData.find(b => b.username === activeUsername);
                const invTableBody = document.getElementById('inv-table-body');
                
                if (!bot || !bot.groupedInventory || bot.groupedInventory.length === 0) {
                    invTableBody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>Inventory kosong/belum update.</td></tr>";
                    return;
                }

                const filtered = bot.groupedInventory.filter(item => 
                    item.name.toLowerCase().includes(filterKeyword.toLowerCase())
                );

                if (filtered.length === 0) {
                    invTableBody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>Item tidak ditemukan.</td></tr>";
                    return;
                }

                invTableBody.innerHTML = filtered.map(item => \`
                    <tr>
                        <td><strong>\${item.name}</strong></td>
                        <td style="color: #38bdf8; font-weight: bold;">\${item.count}</td>
                        <td>\${item.type}</td>
                    </tr>
                \`).join('');
            }

            function filterInventory() {
                const keyword = document.getElementById('inv-search').value;
                renderInventoryTable(keyword);
            }

            function closeInvModal() {
                document.getElementById('inv-modal').style.display = 'none';
            }

            // Muat data pertama kali saat halaman dibuka (Tanpa interval auto-refresh yang merusak tombol)
            refreshData();
            setInterval(refreshData, 3000);
        </script>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;

// Jalankan server lokal HANYA jika tidak berjalan di Vercel (production)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server berjalan di port ${PORT}`);
    });
}

// INI WAJIB UNTUK VERCEL: Export app agar dibaca sebagai Serverless Function
module.exports = app;
