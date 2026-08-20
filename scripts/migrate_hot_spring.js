const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    where: { app_type: 'tabireco' }
  });

  for (const post of posts) {
    const dataToUpdate = {};
    
    if (post.spring_quality && (!post.spring_qualities || post.spring_qualities.length === 0)) {
      dataToUpdate.spring_qualities = [post.spring_quality];
    }
    
    if (post.bath_type && (!post.bath_types || post.bath_types.length === 0)) {
      dataToUpdate.bath_types = [post.bath_type];
    }
    
    if (post.is_source_fed && (!post.source_managements || post.source_managements.length === 0)) {
      if (post.is_source_fed === 'yes') {
        dataToUpdate.source_managements = ['源泉掛け流し'];
      }
    }
    
    // Migrate cold_bath_temp to bath_temperatures Json array
    let bathTemps = [];
    if (post.cold_bath_temp != null) {
      bathTemps.push({
        id: crypto.randomUUID(),
        name: '水風呂',
        min: post.cold_bath_temp,
        max: post.cold_bath_temp
      });
    }
    
    // If there's an existing custom spring temp, we might want to preserve it
    if (post.spring_temp_min != null || post.spring_temp_max != null || post.spring_temp_custom != null) {
      bathTemps.push({
        id: crypto.randomUUID(),
        name: post.spring_temp_custom || '内湯',
        min: post.spring_temp_min,
        max: post.spring_temp_max
      });
    }

    if (bathTemps.length > 0 && !post.bath_temperatures) {
      dataToUpdate.bath_temperatures = bathTemps;
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.post.update({
        where: { id: post.id },
        data: dataToUpdate
      });
      console.log(`Updated post ${post.id}`);
    }
  }

  console.log('Migration complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
