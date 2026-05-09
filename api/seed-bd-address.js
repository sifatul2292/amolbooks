/**
 * Bangladesh Districts & Upazilas Seeder
 *
 * Usage:
 *   node api/seed-bd-address.js
 *
 * Set PRODUCTION_BUILD=true in .env or pass --prod flag to use Atlas URI.
 * Default: uses Atlas URI from configuration.ts (same as local dev).
 *
 * Options:
 *   --dry-run   Print counts only, no DB writes
 *   --prod      Use Atlas URI (default for this script since local dev uses Atlas)
 */

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

const IS_DRY_RUN = process.argv.includes('--dry-run');

// Mirror configuration.ts logic
const MONGO_URI =
  process.env.PRODUCTION_BUILD === 'true'
    ? `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@127.0.0.1:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=${process.env.AUTH_SOURCE}`
    : `mongodb+srv://rejakazi02:tsVvjOhOIqgbsa23@test-softlab-project.wesh3ba.mongodb.net/alambooks?retryWrites=true&w=majority`;

// ─── Bangladesh Administrative Data ──────────────────────────────────────────
// Division (District) → Area (Upazila/Thana) hierarchy
// 64 districts, ~495 upazilas

const BANGLADESH = [
  // ─── Dhaka Division ────────────────────────────────────────────────────────
  {
    district: 'Dhaka',
    upazilas: [
      'Dhamrai', 'Dohar', 'Keraniganj', 'Nawabganj', 'Savar',
      'Adabor', 'Badda', 'Bangshal', 'Cantonment', 'Chokbazar',
      'Dakshinkhan', 'Demra', 'Dhanmondi', 'Gulshan', 'Hazaribagh',
      'Kafrul', 'Kadamtali', 'Khilgaon', 'Khilkhet', 'Kotwali',
      'Lalbagh', 'Mirpur', 'Mohammadpur', 'Motijheel', 'Pallabi',
      'Ramna', 'Rayer Bazar', 'Sabujbagh', 'Shah Ali', 'Sutrapur',
      'Tejgaon', 'Turag', 'Uttara', 'Uttarkhan', 'Vatara',
    ],
  },
  {
    district: 'Gazipur',
    upazilas: ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur', 'Tongi'],
  },
  {
    district: 'Narayanganj',
    upazilas: ['Araihazar', 'Bandar', 'Narayanganj Sadar', 'Rupganj', 'Sonargaon'],
  },
  {
    district: 'Narsingdi',
    upazilas: ['Belabo', 'Monohardi', 'Narsingdi Sadar', 'Palash', 'Raipura', 'Shibpur'],
  },
  {
    district: 'Manikganj',
    upazilas: ['Daulatpur', 'Ghior', 'Harirampur', 'Manikganj Sadar', 'Saturia', 'Shivalaya', 'Singair'],
  },
  {
    district: 'Munshiganj',
    upazilas: ['Gazaria', 'Lohajang', 'Munshiganj Sadar', 'Sirajdikhan', 'Sreenagar', 'Tongibari'],
  },
  {
    district: 'Shariatpur',
    upazilas: ['Bhedarganj', 'Damudya', 'Gosairhat', 'Naria', 'Shariatpur Sadar', 'Zanjira'],
  },
  {
    district: 'Madaripur',
    upazilas: ['Kalkini', 'Madaripur Sadar', 'Rajoir', 'Shibchar'],
  },
  {
    district: 'Faridpur',
    upazilas: ['Alfadanga', 'Bhanga', 'Boalmari', 'Charbhadrasan', 'Faridpur Sadar', 'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha'],
  },
  {
    district: 'Rajbari',
    upazilas: ['Baliakandi', 'Goalandaghat', 'Kalukhali', 'Pangsha', 'Rajbari Sadar'],
  },
  {
    district: 'Gopalganj',
    upazilas: ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'],
  },
  {
    district: 'Kishoreganj',
    upazilas: ['Austagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kishoreganj Sadar', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'],
  },
  {
    district: 'Tangail',
    upazilas: ['Basail', 'Bhuapur', 'Delduar', 'Dhanbari', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur', 'Tangail Sadar'],
  },

  // ─── Chittagong (Chattogram) Division ──────────────────────────────────────
  {
    district: 'Chattogram',
    upazilas: [
      'Anwara', 'Banshkhali', 'Boalkhali', 'Chandanaish', 'Fatikchhari',
      'Hathazari', 'Karnaphuli', 'Lohagara', 'Mirsharai', 'Patiya',
      'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Sitakunda',
      'Chandgaon', 'Double Mooring', 'Khulshi', 'Kotwali', 'Pahartali',
      'Panchlaish', 'Patenga', 'Akbar Shah', 'Bakalia',
    ],
  },
  {
    district: "Cox's Bazar",
    upazilas: ['Chakaria', "Cox's Bazar Sadar", 'Kutubdia', 'Maheshkhali', 'Pekua', 'Ramu', 'Teknaf', 'Ukhia'],
  },
  {
    district: 'Cumilla',
    upazilas: ['Barura', 'Brahmanpara', 'Burichong', 'Chandina', 'Chauddagram', 'Cumilla Sadar', 'Cumilla Sadar South', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Lalmai', 'Meghna', 'Muradnagar', 'Nangalkot', 'Titas'],
  },
  {
    district: 'Feni',
    upazilas: ['Chhagalnaiya', 'Daganbhuiyan', 'Feni Sadar', 'Parshuram', 'Sonagazi', 'Fulgazi'],
  },
  {
    district: 'Noakhali',
    upazilas: ['Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Kabirhat', 'Noakhali Sadar', 'Senbagh', 'Sonaimuri', 'Subarnachar', 'Basan'],
  },
  {
    district: 'Lakshmipur',
    upazilas: ['Kamalnagar', 'Lakshmipur Sadar', 'Ramganj', 'Ramgati', 'Raipur'],
  },
  {
    district: 'Brahmanbaria',
    upazilas: ['Akhaura', 'Ashuganj', 'Banchharampur', 'Bijoynagar', 'Brahmanbaria Sadar', 'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail'],
  },
  {
    district: 'Chandpur',
    upazilas: ['Chandpur Sadar', 'Faridganj', 'Haimchar', 'Hajiganj', 'Kachua', 'Matlab North', 'Matlab South', 'Shahrasti'],
  },
  {
    district: 'Bandarban',
    upazilas: ['Alikadam', 'Bandarban Sadar', 'Lama', 'Naikhongchhari', 'Rowangchhari', 'Ruma', 'Thanchi'],
  },
  {
    district: 'Rangamati',
    upazilas: ['Bagaichhari', 'Barkal', 'Belaichhari', 'Juraichhari', 'Kaptai', 'Kawkhali', 'Langadu', 'Nannerchar', 'Rajasthali', 'Rangamati Sadar'],
  },
  {
    district: 'Khagrachhari',
    upazilas: ['Dighinala', 'Khagrachhari Sadar', 'Lakshmichhari', 'Mahalchhari', 'Manikchhari', 'Matiranga', 'Panchhari', 'Ramgarh'],
  },

  // ─── Rajshahi Division ─────────────────────────────────────────────────────
  {
    district: 'Rajshahi',
    upazilas: ['Bagha', 'Bagmara', 'Charghat', 'Durgapur', 'Godagari', 'Mohanpur', 'Paba', 'Puthia', 'Rajshahi Sadar', 'Tanore'],
  },
  {
    district: 'Chapai Nawabganj',
    upazilas: ['Bholahat', 'Chapai Nawabganj Sadar', 'Gomastapur', 'Nachole', 'Shibganj'],
  },
  {
    district: 'Natore',
    upazilas: ['Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur', 'Natore Sadar', 'Singra'],
  },
  {
    district: 'Naogaon',
    upazilas: ['Atrai', 'Badalgachhi', 'Dhamoirhat', 'Mahadebpur', 'Manda', 'Naogaon Sadar', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar', 'Sapahar'],
  },
  {
    district: 'Bogura',
    upazilas: ['Adamdighi', 'Bogura Sadar', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shahajanpur', 'Sherpur', 'Shibganj', 'Sonatala'],
  },
  {
    district: 'Sirajganj',
    upazilas: ['Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 'Raiganj', 'Shahjadpur', 'Sirajganj Sadar', 'Tarash', 'Ullapara'],
  },
  {
    district: 'Pabna',
    upazilas: ['Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur', 'Ishwardi', 'Pabna Sadar', 'Santhia', 'Sujanagar'],
  },
  {
    district: 'Joypurhat',
    upazilas: ['Akkelpur', 'Joypurhat Sadar', 'Kalai', 'Khetlal', 'Panchbibi'],
  },

  // ─── Khulna Division ───────────────────────────────────────────────────────
  {
    district: 'Khulna',
    upazilas: ['Batiaghata', 'Dacope', 'Daulatpur', 'Dighalia', 'Dumuria', 'Fultala', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsa', 'Terokhada', 'Khulna Sadar'],
  },
  {
    district: 'Jashore',
    upazilas: ['Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Jashore Sadar', 'Manirampur', 'Sharsha'],
  },
  {
    district: 'Satkhira',
    upazilas: ['Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Satkhira Sadar', 'Shyamnagar', 'Tala'],
  },
  {
    district: 'Bagerhat',
    upazilas: ['Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat', 'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola'],
  },
  {
    district: 'Narail',
    upazilas: ['Kalia', 'Lohagara', 'Narail Sadar'],
  },
  {
    district: 'Magura',
    upazilas: ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'],
  },
  {
    district: 'Jhenaidah',
    upazilas: ['Harinakunda', 'Jhenaidah Sadar', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'],
  },
  {
    district: 'Chuadanga',
    upazilas: ['Alamdanga', 'Chuadanga Sadar', 'Damurhuda', 'Jibannagar'],
  },
  {
    district: 'Meherpur',
    upazilas: ['Gangni', 'Meherpur Sadar', 'Mujibnagar'],
  },
  {
    district: 'Kushtia',
    upazilas: ['Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali', 'Kushtia Sadar', 'Mirpur'],
  },

  // ─── Barishal Division ─────────────────────────────────────────────────────
  {
    district: 'Barishal',
    upazilas: ['Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gaurnadi', 'Hizla', 'Barishal Sadar', 'Mehendiganj', 'Muladi', 'Wazirpur'],
  },
  {
    district: 'Bhola',
    upazilas: ['Bhola Sadar', 'Burhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin'],
  },
  {
    district: 'Patuakhali',
    upazilas: ['Bauphal', 'Dashmina', 'Dumki', 'Galachipa', 'Kalapara', 'Mirzaganj', 'Patuakhali Sadar', 'Rangabali'],
  },
  {
    district: 'Pirojpur',
    upazilas: ['Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur', 'Nesarabad', 'Pirojpur Sadar', 'Zianagar'],
  },
  {
    district: 'Jhalokati',
    upazilas: ['Jhalokati Sadar', 'Kathalia', 'Nalchity', 'Rajapur'],
  },
  {
    district: 'Barguna',
    upazilas: ['Amtali', 'Bamna', 'Barguna Sadar', 'Betagi', 'Patharghata', 'Taltali'],
  },

  // ─── Sylhet Division ───────────────────────────────────────────────────────
  {
    district: 'Sylhet',
    upazilas: ['Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Dakshin Surma', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Sylhet Sadar', 'Zakiganj', 'Osmaninagar'],
  },
  {
    district: 'Moulvibazar',
    upazilas: ['Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 'Moulvibazar Sadar', 'Rajnagar', 'Sreemangal'],
  },
  {
    district: 'Habiganj',
    upazilas: ['Ajmiriganj', 'Bahubal', 'Baniachong', 'Chunarughat', 'Habiganj Sadar', 'Lakhai', 'Madhabpur', 'Nabiganj', 'Sayestaganj'],
  },
  {
    district: 'Sunamganj',
    upazilas: ['Bishwambarpur', 'Chhatak', 'Derai', 'Dharmapasha', 'Dowarabazar', 'Jagannathpur', 'Jamalganj', 'Sulla', 'Sunamganj Sadar', 'Tahirpur'],
  },

  // ─── Rangpur Division ──────────────────────────────────────────────────────
  {
    district: 'Rangpur',
    upazilas: ['Badarganj', 'Gangachhara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Rangpur Sadar', 'Taraganj'],
  },
  {
    district: 'Dinajpur',
    upazilas: ['Birampur', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Dinajpur Sadar', 'Fulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'],
  },
  {
    district: 'Kurigram',
    upazilas: ['Bhurungamari', 'Char Rajibpur', 'Chilmari', 'Kurigram Sadar', 'Nageshwari', 'Phulbari', 'Rajarhat', 'Rajibpur', 'Rowmari', 'Ulipur'],
  },
  {
    district: 'Gaibandha',
    upazilas: ['Fulchhari', 'Gaibandha Sadar', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj'],
  },
  {
    district: 'Nilphamari',
    upazilas: ['Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Nilphamari Sadar', 'Saidpur'],
  },
  {
    district: 'Lalmonirhat',
    upazilas: ['Aditmari', 'Hatibandha', 'Kaliganj', 'Lalmonirhat Sadar', 'Patgram'],
  },
  {
    district: 'Thakurgaon',
    upazilas: ['Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail', 'Thakurgaon Sadar'],
  },
  {
    district: 'Panchagarh',
    upazilas: ['Atwari', 'Boda', 'Debiganj', 'Panchagarh Sadar', 'Tetulia'],
  },

  // ─── Mymensingh Division ───────────────────────────────────────────────────
  {
    district: 'Mymensingh',
    upazilas: ['Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gauripur', 'Haluaghat', 'Iswarganj', 'Mymensingh Sadar', 'Muktagachha', 'Nandail', 'Phulpur', 'Trishal', 'Tarakanda'],
  },
  {
    district: 'Jamalpur',
    upazilas: ['Bakshiganj', 'Dewanganj', 'Islampur', 'Jamalpur Sadar', 'Madarganj', 'Melandaha', 'Sarishabari'],
  },
  {
    district: 'Netrokona',
    upazilas: ['Atpara', 'Barhatta', 'Durgapur', 'Kalmakanda', 'Kendua', 'Khaliajuri', 'Madan', 'Mohanganj', 'Netrokona Sadar', 'Purbadhala'],
  },
  {
    district: 'Sherpur',
    upazilas: ['Jhenaigati', 'Nakla', 'Nalitabari', 'Sherpur Sadar', 'Sreebardi'],
  },
];

// ─── Schemas (mirror existing schemas) ───────────────────────────────────────

const DivisionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: String, default: 'publish' },
    priority: { type: Number },
  },
  { timestamps: true },
);

const AreaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    division: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String },
    },
    status: { type: String, default: 'publish' },
    priority: { type: Number },
  },
  { timestamps: true },
);

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const totalDistricts = BANGLADESH.length;
  const totalUpazilas = BANGLADESH.reduce((sum, d) => sum + d.upazilas.length, 0);

  console.log(`\nBangladesh Address Seeder`);
  console.log(`Districts: ${totalDistricts}`);
  console.log(`Upazilas:  ${totalUpazilas}`);

  if (IS_DRY_RUN) {
    console.log('\n[DRY RUN] No DB writes. Exiting.');
    BANGLADESH.forEach((d) => console.log(`  ${d.district}: ${d.upazilas.length} upazilas`));
    return;
  }

  console.log(`\nConnecting to MongoDB...`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected.\n');

  const Division = mongoose.model('Division', DivisionSchema);
  const Area = mongoose.model('Area', AreaSchema);

  // Clear existing data
  const existingDivisions = await Division.countDocuments();
  const existingAreas = await Area.countDocuments();

  if (existingDivisions > 0 || existingAreas > 0) {
    console.log(`Found existing data: ${existingDivisions} districts, ${existingAreas} areas.`);
    console.log('Clearing existing data...');
    await Division.deleteMany({});
    await Area.deleteMany({});
    console.log('Cleared.\n');
  }

  // Seed
  let totalInsertedAreas = 0;

  for (const [i, item] of BANGLADESH.entries()) {
    const division = await Division.create({
      name: item.district,
      status: 'publish',
      priority: i + 1,
    });

    const areas = item.upazilas.map((upazila, j) => ({
      name: upazila,
      division: { _id: division._id, name: item.district },
      status: 'publish',
      priority: j + 1,
    }));

    await Area.insertMany(areas);
    totalInsertedAreas += areas.length;

    console.log(`[${String(i + 1).padStart(2, '0')}/${totalDistricts}] ${item.district}: ${areas.length} upazilas`);
  }

  await mongoose.disconnect();

  console.log(`\nDone!`);
  console.log(`Inserted: ${totalDistricts} districts, ${totalInsertedAreas} upazilas`);
}

seed().catch((err) => {
  console.error('Seeder failed:', err.message);
  process.exit(1);
});
