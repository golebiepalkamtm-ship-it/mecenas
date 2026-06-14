from moa.config import get_admin_models

def get_default_primary_model() -> str:
    from config import settings
    try:
        admin_models = get_admin_models()
        if admin_models:
            return admin_models[0]
    except Exception:
        pass
    return settings.default_models[0]

def get_default_expert_models(exclude_model: str = None) -> list[str]:
    from config import settings
    try:
        admin_models = get_admin_models()
        if admin_models:
            alts = [m for m in admin_models if m != exclude_model]
            if len(alts) >= 2:
                return [exclude_model or alts[0], alts[0], alts[1]]
            elif len(alts) == 1:
                return [exclude_model or alts[0], alts[0], alts[0]]
            else:
                return [exclude_model or admin_models[0]] * 3
    except Exception:
        pass
    
    alts = [m for m in settings.default_models if m != exclude_model]
    if len(alts) >= 2:
        return [exclude_model or alts[0], alts[0], alts[1]]
    elif len(alts) == 1:
        return [exclude_model or alts[0], alts[0], alts[0]]
    else:
        return [exclude_model or settings.default_models[0]] * 3
