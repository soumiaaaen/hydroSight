const fs = require('fs');
const path = 'geoai-frontend/messages/';

const en = JSON.parse(fs.readFileSync(path+'en.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync(path+'fr.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync(path+'ar.json', 'utf8'));

const newEn = {
  status_allowed: 'ALLOWED',
  status_moderated: 'MODERATED',
  status_prohibited: 'PROHIBITED',
  status_critical: 'CRITICAL',
  rec_allowed: 'Resources in good condition. Normal use allowed.',
  rec_moderated: 'Moderate stress detected. Irrigation quotas recommended.',
  rec_prohibited: 'Overexploitation detected. New drilling prohibited.',
  rec_critical: 'Severe water crisis. Immediate stop mandatory.'
};

const newFr = {
  status_allowed: 'AUTORISÉ',
  status_moderated: 'MODÉRÉ',
  status_prohibited: 'INTERDIT',
  status_critical: 'CRITIQUE',
  rec_allowed: 'Ressources en bon état. Utilisation normale autorisée.',
  rec_moderated: 'Stress modéré détecté. Quotas d\'irrigation recommandés.',
  rec_prohibited: 'Surexploitation détectée. Nouveaux forages interdits.',
  rec_critical: 'Crise hydrique sévère. Arrêt immédiat obligatoire.'
};

const newAr = {
  status_allowed: 'مسموح',
  status_moderated: 'معتدل',
  status_prohibited: 'ممنوع',
  status_critical: 'حرج',
  rec_allowed: 'الموارد في حالة جيدة. الاستخدام العادي مسموح.',
  rec_moderated: 'تم اكتشاف إجهاد معتدل. يوصى بحصص الري.',
  rec_prohibited: 'تم اكتشاف استغلال مفرط. حفر آبار جديدة ممنوع.',
  rec_critical: 'أزمة مياه حادة. التوقف الفوري إلزامي.'
};

Object.assign(en.Map, newEn);
Object.assign(fr.Map, newFr);
Object.assign(ar.Map, newAr);

fs.writeFileSync(path+'en.json', JSON.stringify(en, null, 2));
fs.writeFileSync(path+'fr.json', JSON.stringify(fr, null, 2));
fs.writeFileSync(path+'ar.json', JSON.stringify(ar, null, 2));
