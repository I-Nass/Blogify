// Editor niceties: live slug preview, summary counter, live image previews.
document.addEventListener('DOMContentLoaded', () => {
    const slugify = s =>
        String(s).toLowerCase().replace(/['"]/g, '')
                 .replace(/[^a-z0-9]+/g, '-')
                 .replace(/^-+|-+$/g, '').slice(0, 80);

    const title = document.getElementById('title');
    const slugPrev = document.getElementById('slugPreview');
    if (title && slugPrev) {
        const updateSlug = () => { slugPrev.textContent = slugify(title.value) || '…'; };
        title.addEventListener('input', updateSlug);
        updateSlug();
    }

    const summary = document.getElementById('summary');
    const sumCount = document.getElementById('sumCount');
    if (summary && sumCount) {
        const updateCount = () => { sumCount.textContent = summary.value.length + '/500'; };
        summary.addEventListener('input', updateCount);
        updateCount();
    }

    [['imgUrl', 'prevMain'], ['imgUrl2', 'prevMid']].forEach(([inId, prevId]) => {
        const input = document.getElementById(inId);
        const preview = document.getElementById(prevId);
        if (!input || !preview) return;
        input.addEventListener('change', () => {
            if (!preview.dataset.fallback) {
                preview.dataset.fallback = preview.src;
            }
            preview.src = input.value.trim() || preview.dataset.fallback;
        });
        preview.addEventListener('error', () => preview.classList.add('broken'));
        preview.addEventListener('load', () => preview.classList.remove('broken'));
    });
});
