export function sumCompassUsage(records) {
    const out = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
    };
    let any = false;
    for (const r of records) {
        const u = r.usage;
        if (!u)
            continue;
        any = true;
        out.prompt_tokens = (out.prompt_tokens ?? 0) + (u.prompt_tokens ?? 0);
        out.completion_tokens = (out.completion_tokens ?? 0) + (u.completion_tokens ?? 0);
        out.total_tokens = (out.total_tokens ?? 0) + (u.total_tokens ?? 0);
    }
    return any ? out : {};
}
