export default function TermsPage() {
  const updated = 'March 30, 2026';
  return (
    <div style={{ minHeight:'100vh', background:'#0e0e0e', padding:'60px 20px' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>

        <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none', marginBottom:40 }}>
          <svg width="24" height="29" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
            <polygon points="40,0 0,25 40,35" fill="#c41e3a"/>
            <polygon points="40,0 80,25 40,35" fill="#9b1830"/>
            <polygon points="0,25 40,35 18,88" fill="#6e1022"/>
            <polygon points="80,25 40,35 62,88" fill="#c41e3a" opacity="0.78"/>
            <polygon points="40,35 18,88 40,96" fill="#4a0b18"/>
            <polygon points="40,35 62,88 40,96" fill="#851525"/>
          </svg>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:'#e2e8f0' }}>Ruby <span style={{ color:'#c41e3a' }}>Ace</span></span>
        </a>

        <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:38, fontWeight:800, marginBottom:8, letterSpacing:'-0.5px' }}>Terms of Service</h1>
        <p style={{ color:'#475569', fontSize:13, marginBottom:40 }}>Last updated: {updated}</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: `By accessing or using Ruby Ace ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.`
          },
          {
            title: '2. Description of Service',
            body: `Ruby Ace is a daily fantasy sports analytics platform providing DFS lineup optimization, player projections, pick'em tools, and related features. Ruby Ace is for entertainment and informational purposes only. We do not guarantee any specific results from using our tools.`
          },
          {
            title: '3. Eligibility',
            body: `You must be at least 18 years old to use Ruby Ace. By using the Service, you represent that you are 18 or older and legally permitted to participate in daily fantasy sports contests in your jurisdiction.`
          },
          {
            title: '4. User Accounts',
            body: `You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. You must notify us immediately of any unauthorized use of your account.`
          },
          {
            title: '5. Rubys Virtual Currency',
            body: `Rubys are a virtual currency used within Ruby Ace. Rubys have no cash value and cannot be exchanged for real money. Rubys are non-transferable and may expire or be forfeited if your account is terminated. We reserve the right to modify the Rubys system at any time.`
          },
          {
            title: '6. Subscriptions and Payments',
            body: `Premium subscriptions are billed monthly. You may cancel at any time through your account settings. Cancellations take effect at the end of the current billing period. We do not offer refunds for partial subscription periods. Prices are subject to change with 30 days notice.`
          },
          {
            title: '7. Prohibited Conduct',
            body: `You may not use Ruby Ace to violate any laws, infringe on intellectual property rights, transmit harmful or malicious code, attempt to gain unauthorized access to our systems, or use automated bots or scrapers. We reserve the right to terminate accounts that violate these terms.`
          },
          {
            title: '8. Disclaimer of Warranties',
            body: `Ruby Ace is provided "as is" without warranties of any kind. We do not guarantee the accuracy of projections, odds, or other data. DFS involves risk and past performance does not guarantee future results. Use our tools as one of many inputs in your decision-making process.`
          },
          {
            title: '9. Limitation of Liability',
            body: `Ruby Ace shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including any losses from DFS contests. Our total liability shall not exceed the amount you paid us in the past 12 months.`
          },
          {
            title: '10. Changes to Terms',
            body: `We may update these Terms at any time. Continued use of Ruby Ace after changes constitutes acceptance. We will notify users of material changes via email or site notice.`
          },
          {
            title: '11. Contact',
            body: `For questions about these Terms, contact us at: legal@rubyace.pro`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom:32 }}>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:'#e2e8f0', marginBottom:10 }}>
              {section.title}
            </h2>
            <p style={{ color:'#94a3b8', fontSize:14, lineHeight:1.75, margin:0 }}>
              {section.body}
            </p>
          </div>
        ))}

        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:24, marginTop:40, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <a href="/" style={{ fontSize:13, color:'#334155', textDecoration:'none' }}>← Back to Ruby Ace</a>
          <a href="/privacy" style={{ fontSize:13, color:'#334155', textDecoration:'none' }}>Privacy Policy →</a>
        </div>
      </div>
    </div>
  );
}
