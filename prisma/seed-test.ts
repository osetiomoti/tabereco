import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const testPosts = [
  {
    store_name: '銀座 鮨さいとう',
    title: '至高のおまかせコース',
    comment: '人生で食べた中で最高の鮨。シャリの温度が絶妙で、ネタの鮮度が他と全然違う。',
    rating: 5,
    status: 'visited',
    visited_at: new Date('2025-03-10'),
    address: '東京都中央区銀座6-3-8',
    latitude: 35.6699,
    longitude: 139.7637,
    is_favorite: true,
    is_mine_only: false,
  },
  {
    store_name: '丸の内 天ぷら 近藤',
    title: '江戸前天ぷらの老舗',
    comment: '野菜の天ぷらが特に絶品。さつまいもが別格に甘くてびっくりした。揚げ方が神技。',
    rating: 5,
    status: 'visited',
    visited_at: new Date('2025-04-02'),
    address: '東京都千代田区丸の内3-4-1',
    latitude: 35.6775,
    longitude: 139.7640,
    is_favorite: true,
    is_mine_only: false,
  },
  {
    store_name: '新宿 思い出横丁 大桝',
    title: '焼き鳥とホッピーで一杯',
    comment: '昭和の雰囲気が最高。もつ焼きと煮込みをホッピーで流し込む至福タイム。安くて満足度最高。',
    rating: 4,
    status: 'visited',
    visited_at: new Date('2025-02-20'),
    address: '東京都新宿区西新宿1丁目',
    latitude: 35.6936,
    longitude: 139.6999,
    is_favorite: false,
    is_mine_only: false,
  },
  {
    store_name: '六本木 龍山 焼肉',
    title: '黒毛和牛の焼肉コース',
    comment: 'A5ランクの黒毛和牛が口の中でとろける。特にザブトンとミスジが最高だった。',
    rating: 5,
    status: 'visited',
    visited_at: new Date('2025-01-15'),
    address: '東京都港区六本木6-2-31',
    latitude: 35.6628,
    longitude: 139.7310,
    is_favorite: true,
    is_mine_only: false,
  },
  {
    store_name: 'ラーメン 一蘭 渋谷',
    title: '天然とんこつラーメン',
    comment: '集中カウンターで一人でじっくり食べるスタイルが好き。秘伝のたれが絶品。替え玉必須。',
    rating: 4,
    status: 'visited',
    visited_at: new Date('2024-12-25'),
    address: '東京都渋谷区道玄坂2-29-11',
    latitude: 35.6583,
    longitude: 139.6976,
    is_favorite: false,
    is_mine_only: false,
  },
  {
    store_name: 'Pizza Mario 下北沢',
    title: 'ナポリ直輸入の本格ピザ',
    comment: 'マルゲリータのシンプルさが最高。生地がもちもちで端っこがパリッと香ばしい。',
    rating: 4,
    status: 'visited',
    visited_at: new Date('2025-03-28'),
    address: '東京都世田谷区北沢2-37-2',
    latitude: 35.6613,
    longitude: 139.6680,
    is_favorite: false,
    is_mine_only: false,
  },
  {
    store_name: '大阪 道頓堀 今井',
    title: '大阪本場のたこ焼き',
    comment: '外はカリカリ、中はとろとろが完璧。ソースとマヨネーズのバランスが絶妙。',
    rating: 4,
    status: 'visited',
    visited_at: new Date('2025-02-14'),
    address: '大阪府大阪市中央区道頓堀1-7-22',
    latitude: 34.6686,
    longitude: 135.5017,
    is_favorite: true,
    is_mine_only: false,
  },
  {
    store_name: 'スープカレー GARAKU 札幌',
    title: '北海道野菜たっぷりスープカレー',
    comment: '野菜の甘みとスパイスのバランスが絶妙。骨付きチキンが柔らかくスープが美味しすぎて完飲した。',
    rating: 5,
    status: 'visited',
    visited_at: new Date('2025-01-08'),
    address: '北海道札幌市中央区南2条西2丁目6-1',
    latitude: 43.0552,
    longitude: 141.3533,
    is_favorite: true,
    is_mine_only: false,
  },
  {
    store_name: '京都 先斗町 いづう',
    title: '鯖寿司の名店',
    comment: '昆布が巻かれた鯖寿司の優しい味わいが最高。ほどよく締まった鯖と酢飯の絶妙なバランス。',
    rating: 5,
    status: 'want_to_go',
    visited_at: new Date('2025-05-01'),
    address: '京都府京都市中京区先斗町通三条下ル',
    latitude: 35.0070,
    longitude: 135.7731,
    is_favorite: false,
    is_mine_only: false,
  },
  {
    store_name: '博多 中洲 水たき 水月',
    title: '博多水炊きの名店',
    comment: '30年続く鶏スープが深みがあって絶品。地鶏のしゃぶしゃぶが柔らかく旨み十分。最後の雑炊が至高。',
    rating: 4,
    status: 'want_to_go',
    visited_at: new Date('2025-06-15'),
    address: '福岡県福岡市博多区中洲2-2-19',
    latitude: 33.5904,
    longitude: 130.4017,
    is_favorite: true,
    is_mine_only: false,
  },
];

async function main() {
  // Get first user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found! Please run mock-login first.');
    process.exit(1);
  }

  console.log(`Seeding 10 test posts for user: ${user.name} (${user.id})`);

  // Delete existing test posts (optional, comment out if you want to keep)
  // await prisma.post.deleteMany({ where: { user_id: user.id } });

  let created = 0;
  for (const post of testPosts) {
    await prisma.post.create({
      data: {
        ...post,
        user_id: user.id,
        image_urls: [],
      },
    });
    created++;
    console.log(`  ✅ ${created}. ${post.store_name}`);
  }

  console.log(`\n✨ Done! Created ${created} test posts.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
