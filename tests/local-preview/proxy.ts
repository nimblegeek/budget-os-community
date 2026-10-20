import {NextResponse,type NextRequest} from 'next/server';
import {localHost,localOrigin} from './guard';
export function proxy(request:NextRequest){
 if(process.env.NODE_ENV!=='development'||!localHost(request.headers.get('host')))return new NextResponse('Local test environment only',{status:403});
 const origin=request.headers.get('origin');
 if(origin&&!localOrigin(origin,request.headers.get('host')))return new NextResponse('Origin not allowed',{status:403});
 return NextResponse.next();
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
