import crypto from 'crypto';
const mod = await import('../src/models/index.js');
const { BundleRequest, Bundle, BundleRequestRequirement } = mod;

(async ()=>{
  try{
    const requests = await BundleRequest.findAll();
    let totalCreated = 0;
    for(const req of requests){
      const existing = await BundleRequestRequirement.count({ where: { bundle_request_id: req.id } });
      if(existing > 0) continue;
      if(!req.bundle_id) continue;
      const bundle = await Bundle.findByPk(req.bundle_id);
      if(!bundle) continue;
      // Robustly parse template in case it's double-encoded
      let template = bundle.template;
      try {
        while (typeof template === 'string') {
          template = JSON.parse(template);
        }
      } catch (e) {
        // ignore parse errors and treat as empty
      }
      if(!Array.isArray(template) || template.length===0) continue;
      const rows = template.map(f=>({
        bundle_request_id: req.id,
        requirement_id: f.id || crypto.randomUUID(),
        field_name: (f.name||'').toLowerCase().replace(/\s+/g,'_'),
        name: f.name||null,
        description: f.description||null,
        type: f.type||'file',
        is_mandatory: f.required===undefined?true:!!f.required,
        accepted_types: JSON.stringify((() => {
          if (Array.isArray(f.accepted_types)) return f.accepted_types;
          if (typeof f.accepted_types === 'string') return f.accepted_types.split(',').map(s=>s.trim()).filter(Boolean);
          if (Array.isArray(f.accept)) return f.accept;
          if (typeof f.accept === 'string') return f.accept.split(',').map(s=>s.trim()).filter(Boolean);
          return ['pdf','jpg','png'];
        })()),
        status: 'pending'
      }));
      await BundleRequestRequirement.bulkCreate(rows);
      totalCreated += rows.length;
      console.log('Created', rows.length, 'for request', req.id);
    }
    console.log('Total created:', totalCreated);
    process.exit(0);
  }catch(e){console.error(e); process.exit(1)}
})();
