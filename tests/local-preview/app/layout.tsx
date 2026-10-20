import AppLayout from '../../../app/layout';
export const metadata={title:'Budget OS — lokal testmiljö',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){
 return <AppLayout><div style={{padding:'10px 16px',background:'#f5dd97',color:'#342a0f',fontSize:13,position:'relative',zIndex:30,textAlign:'center'}}>Lokal testmiljö · Samma appkod · Bara exempeldata · Ändringar sparas på denna dator</div>{children}</AppLayout>;
}
