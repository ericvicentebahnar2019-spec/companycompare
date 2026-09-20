import type { MetricValueMap } from "@/lib/metrics/types";
import type { RevenueDecomposition } from "./types";

const FACTORS = ["numClientes", "ticketMedio", "frecuenciaCompra"] as const;

function numeric(values: MetricValueMap, id: string): number | null {
  const entry = values[id];
  if (!entry || typeof entry.value !== "number" || !Number.isFinite(entry.value)) {
    return null;
  }
  return entry.value;
}

const EMPTY: RevenueDecomposition = {
  available: false,
  ownImplied: null,
  rivalImplied: null,
  ownResidual: null,
  rivalResidual: null,
  factors: [],
  note: "Faltan datos de clientes, ticket medio o frecuencia de compra en alguna de las dos empresas, así que no se puede repartir la brecha de facturación entre sus factores.",
};

/**
 * Reparte la brecha de facturación entre sus tres factores multiplicativos:
 *
 *   facturación ≈ nº de clientes × ticket medio × frecuencia de compra
 *
 * Como la relación es un producto, se descompone en logaritmos: el logaritmo
 * del cociente total es la suma de los logaritmos de los cocientes de cada
 * factor, y la parte que aporta cada uno es su peso dentro de esa suma. Es un
 * reparto exacto, no una estimación: si los tres factores explican menos de lo
 * que dice la facturación declarada, la diferencia aparece como residuo en
 * lugar de repartirse.
 */
export function decomposeRevenueGap(
  own: MetricValueMap,
  rival: MetricValueMap,
): RevenueDecomposition {
  const ownFactors = FACTORS.map((id) => numeric(own, id));
  const rivalFactors = FACTORS.map((id) => numeric(rival, id));

  if (
    ownFactors.some((v) => v === null || v <= 0) ||
    rivalFactors.some((v) => v === null || v <= 0)
  ) {
    return EMPTY;
  }

  const ownValues = ownFactors as number[];
  const rivalValues = rivalFactors as number[];

  const ownImplied = ownValues.reduce((a, b) => a * b, 1);
  const rivalImplied = rivalValues.reduce((a, b) => a * b, 1);

  const logs = FACTORS.map((_, i) => Math.log(rivalValues[i] / ownValues[i]));
  const totalLog = logs.reduce((a, b) => a + b, 0);

  if (!Number.isFinite(totalLog) || Math.abs(totalLog) < 1e-9) {
    return {
      available: true,
      ownImplied,
      rivalImplied,
      ownResidual: residual(numeric(own, "facturacion"), ownImplied),
      rivalResidual: residual(numeric(rival, "facturacion"), rivalImplied),
      factors: FACTORS.map((id, i) => ({
        metricId: id,
        ownValue: ownValues[i],
        rivalValue: rivalValues[i],
        ratio: rivalValues[i] / ownValues[i],
        contribution: 0,
      })),
      note: "Las dos empresas facturan prácticamente lo mismo según sus factores de cliente, así que no hay brecha que repartir.",
    };
  }

  const factors = FACTORS.map((id, i) => ({
    metricId: id,
    ownValue: ownValues[i],
    rivalValue: rivalValues[i],
    ratio: rivalValues[i] / ownValues[i],
    contribution: logs[i] / totalLog,
  }));

  return {
    available: true,
    ownImplied,
    rivalImplied,
    ownResidual: residual(numeric(own, "facturacion"), ownImplied),
    rivalResidual: residual(numeric(rival, "facturacion"), rivalImplied),
    factors,
    note: "El reparto se obtiene descomponiendo en logaritmos el producto clientes × ticket medio × frecuencia. Los tres porcentajes suman 100 %: un factor en el que la empresa va por delante entra con signo negativo, porque reduce la brecha en lugar de ampliarla.",
  };
}

function residual(declared: number | null, implied: number): number | null {
  if (declared === null || implied <= 0) return null;
  return declared / implied - 1;
}
