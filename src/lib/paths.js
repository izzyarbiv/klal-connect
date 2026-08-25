export function slugify(str){
  return String(str||'').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,80);
}

export function providerPath(provider){
  const seg = provider.slug || provider.id;
  const isGemach = (provider.category||'').toLowerCase().includes('gemach');
  return `/${isGemach?'gemach':'provider'}/${seg}`;
}

export function companyPath(company){
  return `/company/${company.slug || company.id}`;
}

// Find a unique slug for an entity collection by checking existing slugs.
export async function uniqueSlugFor(entity, base){
  const slug = slugify(base);
  if(!slug) return slug;
  const taken = new Set();
  try{
    const matches = await entity.filter({ slug });
    matches.forEach(m => taken.add(m.slug));
  }catch{}
  if(!taken.has(slug)) return slug;
  let n=2;
  while(taken.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}