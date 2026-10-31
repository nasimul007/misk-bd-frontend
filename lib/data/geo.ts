// Bangladesh geography for the checkout address cascade: 8 divisions, 64 districts, key upazilas.
// Reference data. The backend must validate that a district belongs to its division and an upazila to its district.
const sadar = (d: string) => [`${d} Sadar`, "Other area"];

export const geo: Record<string, Record<string, string[]>> = {
  "Dhaka": { "Dhaka": ["Gulshan", "Dhanmondi", "Mirpur", "Uttara", "Mohammadpur"], "Faridpur": sadar("Faridpur"), "Gazipur": ["Tongi", "Gazipur Sadar", "Kaliakair"], "Gopalganj": sadar("Gopalganj"), "Kishoreganj": sadar("Kishoreganj"), "Madaripur": sadar("Madaripur"), "Manikganj": sadar("Manikganj"), "Munshiganj": sadar("Munshiganj"), "Narayanganj": ["Narayanganj Sadar", "Bandar", "Sonargaon"], "Narsingdi": sadar("Narsingdi"), "Rajbari": sadar("Rajbari"), "Shariatpur": sadar("Shariatpur"), "Tangail": sadar("Tangail") },
  "Chattogram": { "Bandarban": sadar("Bandarban"), "Brahmanbaria": sadar("Brahmanbaria"), "Chandpur": sadar("Chandpur"), "Chattogram": ["Kotwali", "Pahartali", "Halishahar", "Panchlaish"], "Cumilla": sadar("Cumilla"), "Cox's Bazar": ["Cox's Bazar Sadar", "Teknaf", "Ramu"], "Feni": sadar("Feni"), "Khagrachhari": sadar("Khagrachhari"), "Lakshmipur": sadar("Lakshmipur"), "Noakhali": sadar("Noakhali"), "Rangamati": sadar("Rangamati") },
  "Rajshahi": { "Bogura": ["Bogura Sadar", "Sherpur", "Shibganj"], "Joypurhat": sadar("Joypurhat"), "Naogaon": sadar("Naogaon"), "Natore": sadar("Natore"), "Chapainawabganj": sadar("Chapainawabganj"), "Pabna": sadar("Pabna"), "Rajshahi": ["Boalia", "Rajpara", "Motihar"], "Sirajganj": sadar("Sirajganj") },
  "Khulna": { "Bagerhat": sadar("Bagerhat"), "Chuadanga": sadar("Chuadanga"), "Jashore": ["Jashore Sadar", "Abhaynagar"], "Jhenaidah": sadar("Jhenaidah"), "Khulna": ["Khulna Sadar", "Sonadanga", "Khalishpur"], "Kushtia": sadar("Kushtia"), "Magura": sadar("Magura"), "Meherpur": sadar("Meherpur"), "Narail": sadar("Narail"), "Satkhira": sadar("Satkhira") },
  "Barisal": { "Barguna": sadar("Barguna"), "Barisal": sadar("Barisal"), "Bhola": sadar("Bhola"), "Jhalokati": sadar("Jhalokati"), "Patuakhali": sadar("Patuakhali"), "Pirojpur": sadar("Pirojpur") },
  "Sylhet": { "Habiganj": sadar("Habiganj"), "Moulvibazar": ["Moulvibazar Sadar", "Sreemangal"], "Sunamganj": sadar("Sunamganj"), "Sylhet": ["Sylhet Sadar", "Zindabazar", "Beanibazar"] },
  "Rangpur": { "Dinajpur": sadar("Dinajpur"), "Gaibandha": sadar("Gaibandha"), "Kurigram": sadar("Kurigram"), "Lalmonirhat": sadar("Lalmonirhat"), "Nilphamari": sadar("Nilphamari"), "Panchagarh": sadar("Panchagarh"), "Rangpur": sadar("Rangpur"), "Thakurgaon": sadar("Thakurgaon") },
  "Mymensingh": { "Jamalpur": sadar("Jamalpur"), "Mymensingh": sadar("Mymensingh"), "Netrokona": sadar("Netrokona"), "Sherpur": sadar("Sherpur") },
};

export const countries = ["India", "Saudi Arabia", "UAE", "UK", "USA", "Malaysia", "Qatar", "Kuwait", "Australia", "Canada", "Singapore", "Other"];

export const dialCodes: { country: string; code: string }[] = [{ country: "India", code: "+91" }, { country: "Saudi Arabia", code: "+966" }, { country: "UAE", code: "+971" }, { country: "UK", code: "+44" }, { country: "USA", code: "+1" }, { country: "Malaysia", code: "+60" }, { country: "Qatar", code: "+974" }, { country: "Kuwait", code: "+965" }, { country: "Australia", code: "+61" }, { country: "Canada", code: "+1" }, { country: "Singapore", code: "+65" }, { country: "Oman", code: "+968" }, { country: "Bahrain", code: "+973" }, { country: "Italy", code: "+39" }, { country: "Germany", code: "+49" }, { country: "France", code: "+33" }];
