import csv
import collections
import statistics
import json

def analyze():
    file_path = r'c:\Users\Marcin_Palka\Desktop\openrouter_activity_2026-04-14.csv'
    data = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    model_metrics = collections.defaultdict(lambda: {
        'costs': [], 'p_tokens': [], 'c_tokens': [], 'lats': [], 
        'reasons': collections.Counter(), 'prov': collections.Counter()
    })

    total_lost_on_truncation = 0.0

    for row in data:
        m = row['model_permaslug']
        try:
            c = float(row['cost_total']) if row['cost_total'] else 0.0
            p = int(row['tokens_prompt']) if row['tokens_prompt'] else 0
            ct = int(row['tokens_completion']) if row['tokens_completion'] else 0
            l = float(row['generation_time_ms']) if row['generation_time_ms'] else 0.0
            r = row['finish_reason_normalized'] or 'unknown'
            pr = row['provider_name'] or 'unknown'
            
            sm = model_metrics[m]
            sm['costs'].append(c)
            sm['p_tokens'].append(p)
            sm['c_tokens'].append(ct)
            if l > 0: sm['lats'].append(l)
            sm['reasons'][r] += 1
            sm['prov'][pr] += 1
            
            if r == 'length':
                total_lost_on_truncation += c
        except:
            continue

    print("=== ULTRA-DEEP ANALYTICS REPORT: LLM ENGINE PERFORMANCE ===")
    print(f"Total entries analyzed: {len(data)}")
    print(f"Economic Leakage (Truncated Output Costs): ${total_lost_on_truncation:.6f}")
    print("-" * 60)

    sorted_models = sorted(model_metrics.items(), key=lambda x: sum(x[1]['costs']), reverse=True)

    for m, sm in sorted_models[:20]:
        total_m_cost = sum(sm['costs'])
        cnt = len(sm['costs'])
        avg_p = sum(sm['p_tokens']) / cnt
        max_p = max(sm['p_tokens'])
        avg_c = sum(sm['c_tokens']) / cnt
        
        lats = sm['lats']
        med_lat = statistics.median(lats) / 1000 if lats else 0
        p95_lat = statistics.quantiles(lats, n=20)[18] / 1000 if len(lats) > 1 else med_lat
        
        total_tokens = sum(sm['p_tokens']) + sum(sm['c_tokens'])
        cpmnt = (total_m_cost / (total_tokens / 1000000)) if total_tokens > 0 else 0
        
        success_count = sm['reasons'].get('stop', 0)
        success_rate = (success_count / cnt) * 100
        
        print(f"MODEL: {m}")
        print(f"  [ECONOMY] Total Spend: ${total_m_cost:.4f} | Avg/Call: ${total_m_cost/cnt:.5f} | CPMT: ${cpmnt:.2f}/1M tokens")
        print(f"  [CAPACITY] Avg Prompt: {int(avg_p)} tokens | Peak Prompt: {max_p} tokens | Avg Output: {int(avg_c)} tokens")
        print(f"  [STABILITY] Success Rate: {success_rate:.1f}% | Truncations: {sm['reasons'].get('length', 0)} | Filtered: {sm['reasons'].get('content_filter', 0)}")
        print(f"  [LATENCY] Median: {med_lat:.2f}s | Tail (P95): {p95_lat:.2f}s")
        print(f"  [ROUTING] Providers: {dict(sm['prov'])}")
        print("." * 60)

if __name__ == "__main__":
    analyze()
