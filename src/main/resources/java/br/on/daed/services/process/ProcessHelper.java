/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.process;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 *
 * @author csiqueira
 */
public class ProcessHelper {

    // src: http://stackoverflow.com/questions/5711084/java-runtime-getruntime-getting-output-from-executing-a-command-line-program
    public static void outputProcess(Process proc) throws IOException {
        BufferedReader stdInput = new BufferedReader(new InputStreamReader(proc.getInputStream()));

        BufferedReader stdError = new BufferedReader(new InputStreamReader(proc.getErrorStream()));

        // read the output from the command
        System.out.println("Here is the standard output of the command:\n");
        String s = null;
        while ((s = stdInput.readLine()) != null) {
            System.out.println(s);
        }

        // read any errors from the attempted command
        System.out.println("Here is the standard error of the command (if any):\n");
        while ((s = stdError.readLine()) != null) {
            System.out.println(s);
        }
    }
    
}
