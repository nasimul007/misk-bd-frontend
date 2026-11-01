// Reference data for the checkout address and phone fields, kept as plain JSON so it is bundled with the
// page and costs no request or database read.
//
//   bd-geo.json    division -> district -> upazilas / thanas (8 divisions, 64 districts; the Dhaka and Chattogram
//                  city thanas are included next to the upazilas)
//   countries.json every country and territory with a calling code, except Bangladesh (international buyers)
//
// The server validates a district against its division and an upazila against its district with this same data.
import bd from "./bd-geo.json";
import world from "./countries.json";

export const geo: Record<string, Record<string, string[]>> = bd;

export const countries: string[] = world.map((c) => c.name);

export const dialCodes: { country: string; code: string }[] = world.map((c) => ({ country: c.name, code: c.dial }));

/** One entry per calling code (several countries share +1, +7, ...), for the phone code dropdown. */
export const dialOptions: { code: string; label: string }[] = (() => {
  const byCode = new Map<string, string[]>();
  for (const c of world) byCode.set(c.dial, [...(byCode.get(c.dial) ?? []), c.name]);
  return [...byCode.entries()]
    .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
    .map(([code, names]) => ({ code, label: `${code} · ${names.slice(0, 2).join(", ")}${names.length > 2 ? ", …" : ""}` }));
})();
