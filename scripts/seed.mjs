import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding i-Dhanwantari ENT Patient Education database with Dhingra ENT Clinical Content...');

  // Clean old records — scoped to only the tables this script actually repopulates below.
  // This previously deleted ~28 tables (every Topic, EducationOrder, PatientRef, consent
  // and acknowledgement record in the database) while only ever recreating 2 of them,
  // so running `npm run db:seed` against a populated database silently destroyed almost
  // everything in it.
  await prisma.dhingraClinicalGuide.deleteMany();
  await prisma.preventableHarmAlert.deleteMany();

  // 1. Dhingra ENT Clinical Guides
  const dhingraGuides = [
    {
      specialty: 'Otology',
      title: 'CSOM & Dry Ear Precautions (कान का बहना एवं सूखा रखने का नियम)',
      description: 'Chronic Suppurative Otitis Media (CSOM) with eardrum perforation. Safe tubotympanic vs unsafe attic cholesteatoma.',
      actionRules: 'Plug ear canal with Vaseline-coated cotton before bathing. Avoid swimming. Schedule Tympanoplasty/Mastoidectomy to close hole and restore hearing.',
      warningSign: 'Foul-smelling blood-stained ear discharge or facial nerve weakness requires immediate surgical evaluation.'
    },
    {
      specialty: 'Rhinology',
      title: 'FESS Nasal Douching & Septal Hematoma (नाक की सफाई एवं चोट के बाद सूजन)',
      description: 'Post-operative Functional Endoscopic Sinus Surgery (FESS) care and traumatic nasal septal hematoma warning.',
      actionRules: 'Perform warm alkaline saline nasal douching 3-4 times daily for 6 weeks to clear crusts and prevent synechiae adhesions.',
      warningSign: 'Double-sided painful nasal septum swelling after injury requires immediate surgical drainage to prevent nose collapse.'
    },
    {
      specialty: 'Pharynx',
      title: 'Quinsy Abscess & Tonsil Bleed D5-10 (गले का फोड़ा एवं टॉन्सिल बलीडिंग)',
      description: 'Peritonsillar abscess (Quinsy) and Day 5 to 10 secondary post-tonsillectomy bleeding alert.',
      actionRules: 'Spit out all blood; do not swallow. Gurgle ice water and report to casualty immediately for secondary bleeding.',
      warningSign: 'Severe one-sided throat pain, inability to open mouth (trismus), and hot-potato voice indicates Quinsy needing needle aspiration.'
    },
    {
      specialty: 'Laryngology',
      title: 'Vocal Cord Polyps & Absolute Voice Rest (आवाज बैठना एवं वोकल कॉर्ड नोड्यूल)',
      description: 'Vocal cord nodules and polyps caused by voice abuse, shouting, or persistent throat clearing.',
      actionRules: 'Maintain absolute voice rest. CRITICAL: Do NOT whisper! Whispering strains vocal cords more than normal speech.',
      warningSign: 'Hoarseness of voice lasting longer than 3 weeks requires flexible fiberoptic laryngoscopy to rule out vocal cord lesions.'
    },
    {
      specialty: 'Salivary Glands',
      title: 'Submandibular Salivary Stone (लार की ग्रंथि में पथरी)',
      description: 'Sialolithiasis causing painful swelling under the jaw that increases during mealtime when smelling or eating food.',
      actionRules: 'Apply warm compresses, massage gland gently toward front of mouth, drink plenty of water, and suck sour lemon drops.',
      warningSign: 'High fever with redness and severe neck pain indicates acute bacterial sialadenitis requiring antibiotics.'
    },
    {
      specialty: 'Thyroid',
      title: 'Post-Thyroidectomy Hypocalcemia Alert (थायरॉइड ऑपरेशन के बाद कैल्शियम की कमी)',
      description: 'Low blood calcium levels after total thyroidectomy due to temporary parathyroid gland shock.',
      actionRules: 'Take oral Calcium Carbonate and Vitamin D3 (Calcitriol) supplements strictly as prescribed.',
      warningSign: 'Tingling or numbness around lips, fingertips, or muscle cramps (tetany) requires immediate IV Calcium Gluconate.'
    }
  ];

  for (const dg of dhingraGuides) {
    await prisma.dhingraClinicalGuide.create({ data: dg });
  }

  // 2. Preventable Harm & Safety Alerts
  const harmAlerts = [
    {
      procedureCode: 'POST-THYROIDECTOMY-CALCIUM-EMERGENCY',
      dayIndex: 1,
      alertTitle: '🚨 Post-Thyroidectomy Calcium Deficiency Alert (कैल्शियम की कमी की चेतावनी)',
      alertMessage: 'Tingling around your mouth or fingertips after thyroid surgery indicates dangerously low calcium (Hypocalcemia)! Take your prescribed calcium tablets immediately and visit emergency casualty if severe cramps occur!',
      urgencyLevel: 'EMERGENCY'
    },
    {
      procedureCode: 'WHISPERING-VOICE-REST-MYTH',
      dayIndex: 1,
      alertTitle: '⚠ Whispering Voice Rest Warning (फुसफुसाकर बात न करें)',
      alertMessage: 'Whispering exerts HIGHER mechanical friction on vocal cords than speaking! During voice rest for hoarseness, maintain total quiet and sip water.',
      urgencyLevel: 'WARNING'
    }
  ];

  for (const alert of harmAlerts) {
    await prisma.preventableHarmAlert.create({ data: alert });
  }

  console.log('Database successfully seeded with Dhingra ENT Content!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
